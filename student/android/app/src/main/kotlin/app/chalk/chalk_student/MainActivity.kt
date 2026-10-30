package app.chalk.chalk_student

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "app.chalk.chalk_student/join"
    private var channel: MethodChannel? = null
    private var multicastLock: WifiManager.MulticastLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        super.onCreate(savedInstanceState)
        acquireBeaconLock()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        channel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "consumeJoinCode" -> result.success(joinPayload(intent))
                "downloadModel" -> {
                    val url = call.argument<String>("url")
                    val fileName = call.argument<String>("fileName")
                    if (url.isNullOrBlank() || fileName.isNullOrBlank()) {
                        result.error("bad_args", "Missing model address", null)
                        return@setMethodCallHandler
                    }
                    askNotificationPermission()
                    result.success(ModelDownload(this).start(url, fileName))
                }
                "modelDownloadStatus" -> {
                    val raw = call.argument<String>("id")
                    val id = raw?.toLongOrNull()
                    if (id == null) {
                        result.error("bad_args", "Missing download", null)
                        return@setMethodCallHandler
                    }
                    result.success(ModelDownload(this).status(id))
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        channel?.invokeMethod("joinIntent", joinPayload(intent))
    }

    override fun onDestroy() {
        if (multicastLock?.isHeld == true) {
            multicastLock?.release()
        }
        super.onDestroy()
    }

    private fun joinPayload(source: Intent?): Map<String, String?> {
        return mapOf(
            "code" to source?.getStringExtra("code")?.trim()?.ifEmpty { null },
            "uri" to source?.dataString,
        )
    }

    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT < 33) return
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return
        }
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 41)
    }

    private fun acquireBeaconLock() {
        try {
            val wifi = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                ?: return
            multicastLock = wifi.createMulticastLock("chalk-beacon").apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (error: RuntimeException) {
            multicastLock = null
        }
    }
}
