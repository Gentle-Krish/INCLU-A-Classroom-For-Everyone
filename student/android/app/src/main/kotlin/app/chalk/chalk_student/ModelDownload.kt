package app.chalk.chalk_student

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import java.io.File

/** System download for the notes model. It keeps running when the screen turns off. */
class ModelDownload(private val context: Context) {
    private val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

    fun destination(fileName: String): File {
        val root = context.getExternalFilesDir(null) ?: context.filesDir
        return File(root, fileName)
    }

    fun start(url: String, fileName: String): Map<String, Any?> {
        val dest = destination(fileName)
        if (dest.exists() && dest.length() >= EXPECTED_BYTES) {
            return mapOf("state" to "complete", "path" to dest.absolutePath, "bytes" to dest.length(), "percent" to 100)
        }
        val existing = findActive()
        if (existing != null) return status(existing)
        if (dest.exists()) dest.delete()
        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("Chalk notes model")
            .setDescription("Downloading the notes model")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setDestinationInExternalFilesDir(context, null, fileName)
        val id = manager.enqueue(request)
        return mapOf("state" to "started", "id" to id.toString(), "path" to dest.absolutePath, "bytes" to 0L, "percent" to 0)
    }

    fun status(id: Long): Map<String, Any?> {
        val query = DownloadManager.Query().setFilterById(id)
        val cursor = manager.query(query) ?: return mapOf("state" to "missing")
        cursor.use {
            if (!it.moveToFirst()) return mapOf("state" to "missing")
            val state = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val soFar = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = it.getLong(it.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val expected = if (total > 0) total else EXPECTED_BYTES
            val percent = ((soFar * 100) / expected).toInt().coerceIn(0, 100)
            val local = it.getString(it.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))
            return when (state) {
                DownloadManager.STATUS_SUCCESSFUL -> mapOf(
                    "state" to "complete",
                    "id" to id.toString(),
                    "path" to pathOf(local),
                    "bytes" to soFar,
                    "percent" to 100,
                )
                DownloadManager.STATUS_FAILED -> {
                    val reason = it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                    manager.remove(id)
                    mapOf(
                        "state" to "failed",
                        "id" to id.toString(),
                        "message" to failureMessage(reason),
                    )
                }
                else -> mapOf(
                    "state" to if (state == DownloadManager.STATUS_PAUSED) "paused" else "running",
                    "id" to id.toString(),
                    "bytes" to soFar,
                    "percent" to percent,
                )
            }
        }
    }

    private fun findActive(): Long? {
        val cursor = manager.query(DownloadManager.Query()) ?: return null
        cursor.use {
            val idCol = it.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)
            val titleCol = it.getColumnIndexOrThrow(DownloadManager.COLUMN_TITLE)
            val statusCol = it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)
            while (it.moveToNext()) {
                if (it.getString(titleCol) != "Chalk notes model") continue
                val state = it.getInt(statusCol)
                if (state == DownloadManager.STATUS_PENDING ||
                    state == DownloadManager.STATUS_RUNNING ||
                    state == DownloadManager.STATUS_PAUSED
                ) {
                    return it.getLong(idCol)
                }
            }
        }
        return null
    }

    private fun pathOf(localUri: String?): String {
        if (!localUri.isNullOrBlank()) {
            val uri = Uri.parse(localUri)
            if (uri.scheme == "file" && !uri.path.isNullOrBlank()) return uri.path!!
        }
        return destination("gemma-4-E2B-it.litertlm").absolutePath
    }

    private fun failureMessage(reason: Int): String {
        return when (reason) {
            DownloadManager.ERROR_INSUFFICIENT_SPACE ->
                "This phone does not have enough free space for the model."
            DownloadManager.ERROR_DEVICE_NOT_FOUND,
            DownloadManager.ERROR_FILE_ERROR ->
                "The phone could not save the model."
            else -> "The model did not download. Check the internet and try again."
        }
    }

    private companion object {
        const val EXPECTED_BYTES = 2_588_147_712L
    }
}
