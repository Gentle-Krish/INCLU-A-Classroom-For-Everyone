/**
 * Curated educational mindmaps with high pedagogical accuracy,
 * zero syntax errors, and instant response latency (<10ms).
 */

export interface CuratedMindmap {
  title: string;
  code: string;
  summary: string;
}

export function getCuratedMindmap(query: string): CuratedMindmap | null {
  if (!query || typeof query !== 'string') return null;
  const t = query.toLowerCase();

  // 1. Photosynthesis & Plant Biology (resilient to typos: phtosyntehsis, fotosintesis, etc.)
  if (/(?:p[h|f]o?t?o?s[y|i]nt|sintesis|synthe|chloroplast)/i.test(t)) {
    return {
      title: 'Photosynthesis',
      summary: 'all inputs, outputs, light-dependent and Calvin cycle stages, chloroplast structures, and ecological significance',
      code: `mindmap
  root((Photosynthesis))
    Inputs Reactants
      Light Energy Sunlight
      Water H2O
      Carbon Dioxide CO2
    Outputs Products
      Glucose C6H12O6
      Oxygen O2
    Stages
      Light-Dependent Reactions
        Thylakoid Membrane
        Splits H2O Releases O2
        Generates ATP and NADPH
      Calvin Cycle Light-Independent
        Stroma
        Fixes CO2 into Glucose
        Uses ATP and NADPH
    Location and Machinery
      Chloroplast Organelles
      Chlorophyll Pigments
      Stomata Gas Exchange
    Importance
      Primary Energy for Ecosystems
      Produces Atmospheric Oxygen`
    };
  }

  // 2. Cellular Structure & Organelles
  if (/\b(?:cell|cells|sel|cellular|organelle|organelles|sitoplasma|mitokondria|cytoplasm)\b/i.test(t)) {
    return {
      title: 'Cell Structure',
      summary: 'membrane boundaries, nucleus, metabolic organelles, and plant-specific structures',
      code: `mindmap
  root((Cell Structure))
    Membrane and Boundary
      Plasma Membrane
      Cell Wall Plants only
    Nucleus
      Nuclear Membrane
      DNA and Chromatin
      Nucleolus
    Cytoplasm and Organelles
      Mitochondria Powerhouse
      Ribosomes Protein Synthesis
      Endoplasmic Reticulum
      Golgi Apparatus
    Plant Specific
      Chloroplasts Photosynthesis
      Large Central Vacuole`
    };
  }

  // 3. Water Cycle / Hydrological Cycle
  if (/(?:water\s*cycle|daur\s*air|siklus\s*air|hydrolog)/i.test(t)) {
    return {
      title: 'Water Cycle',
      summary: 'evaporation, transpiration, condensation, precipitation, and collection systems',
      code: `mindmap
  root((Water Cycle))
    Evaporation and Transpiration
      Solar Heating of Water
      Plant Transpiration
    Condensation
      Cooling in Atmosphere
      Cloud and Fog Formation
    Precipitation
      Rain
      Snow and Sleet
      Hail
    Collection and Runoff
      Surface Runoff into Rivers
      Groundwater Infiltration
      Oceans and Lakes Storage`
    };
  }

  // 4. Solar System & Astronomy
  if (/(?:solar\s*system|tata\s*surya|planets?|astronomy|milky\s*way)/i.test(t)) {
    return {
      title: 'Solar System',
      summary: 'central star, terrestrial inner planets, gas and ice giants, and small celestial bodies',
      code: `mindmap
  root((Solar System))
    Central Star
      The Sun
      Nuclear Fusion Core
    Terrestrial Inner Planets
      Mercury
      Venus
      Earth with Moon
      Mars
    Gas and Ice Giants
      Jupiter Great Red Spot
      Saturn Ring System
      Uranus Tilted Axis
      Neptune Blue Giant
    Small Bodies
      Asteroid Belt
      Kuiper Belt and Comets
      Dwarf Planets Pluto`
    };
  }

  // 5. Human Respiratory System
  if (/(?:respirat|pernapasan|paru|lungs?|breathing)/i.test(t)) {
    return {
      title: 'Respiratory System',
      summary: 'upper and lower respiratory tracts, mechanics of breathing, and alveolar gas exchange',
      code: `mindmap
  root((Respiratory System))
    Upper Tract
      Nose and Nasal Cavity
      Pharynx and Larynx
    Lower Tract
      Trachea Windpipe
      Bronchi and Bronchioles
      Alveoli Air Sacs
    Mechanism
      Inhalation Diaphragm Contracts
      Exhalation Diaphragm Relaxes
      Gas Exchange in Alveoli
    Functions
      Oxygen Supply to Blood
      Carbon Dioxide Removal
      Vocal Sound Production`
    };
  }

  // 6. Human Digestive System
  if (/(?:digest|pencernaan|lambung|stomach|alimentary)/i.test(t)) {
    return {
      title: 'Digestive System',
      summary: 'mechanical and chemical digestion, digestive organs, and nutrient absorption',
      code: `mindmap
  root((Digestive System))
    Gastrointestinal Tract
      Mouth and Teeth
      Esophagus Peristalsis
      Stomach Gastric Acid
      Small Intestine Absorption
      Large Intestine Water Uptake
    Accessory Organs
      Salivary Glands Amylase
      Liver Bile Production
      Gallbladder Bile Storage
      Pancreas Digestive Enzymes
    Processes
      Ingestion
      Mechanical Digestion
      Chemical Digestion
      Absorption of Nutrients
      Elimination of Waste`
    };
  }

  // 7. Human Circulatory System / Heart
  if (/(?:circulat|peredaran\s*darah|jantung|cardio|blood\s*vessel)/i.test(t)) {
    return {
      title: 'Circulatory System',
      summary: 'heart anatomy, blood vessel networks, systemic circulation, and blood components',
      code: `mindmap
  root((Circulatory System))
    The Heart
      Atria Upper Chambers
      Ventricles Lower Chambers
      Heart Valves
      Cardiac Pacemaker
    Blood Vessels
      Arteries Away from Heart
      Veins Towards Heart
      Capillaries Microcirculation
    Circuits
      Pulmonary Circuit to Lungs
      Systemic Circuit to Body
    Blood Components
      Red Blood Cells Erythrocytes
      White Blood Cells Leukocytes
      Platelets Clotting
      Plasma Fluid Medium`
    };
  }

  // 8. Human Nervous System & Brain
  if (/(?:nervous|syaraf|saraf|otak|brain|neuron)/i.test(t)) {
    return {
      title: 'Nervous System',
      summary: 'central and peripheral nervous systems, brain structures, and neuron signaling',
      code: `mindmap
  root((Nervous System))
    Central Nervous System
      Brain
        Cerebrum Higher Thinking
        Cerebellum Balance
        Brainstem Autonomic Control
      Spinal Cord Signal Highway
    Peripheral Nervous System
      Somatic Voluntary Movement
      Autonomic Involuntary
        Sympathetic Fight or Flight
        Parasympathetic Rest and Digest
    Functional Unit
      Neurons Nerve Cells
      Dendrites and Axons
      Synaptic Neurotransmitters`
    };
  }

  // 9. Ecosystems & Food Web
  if (/(?:ecosystem|ekosistem|food\s*web|food\s*chain|rantai\s*makanan)/i.test(t)) {
    return {
      title: 'Ecosystem & Food Web',
      summary: 'trophic levels, energy flow, biotic and abiotic factors, and ecological interactions',
      code: `mindmap
  root((Ecosystem))
    Trophic Levels
      Producers Autotrophs
      Primary Consumers Herbivores
      Secondary Consumers Carnivores
      Apex Predators Top Carnivores
      Decomposers Recyclers
    Components
      Biotic Living Organisms
      Abiotic Climate and Soil
    Energy Flow
      Ten Percent Energy Rule
      Solar Input
      Heat Loss
    Interactions
      Predation and Herbivory
      Symbiosis Mutualism
      Competition for Resources`
    };
  }

  // 10. States of Matter
  if (/(?:states\s*of\s*matter|wujud\s*zat|padat\s*cair|solid\s*liquid\s*gas)/i.test(t)) {
    return {
      title: 'States of Matter',
      summary: 'solids, liquids, gases, plasma, and phase transitions',
      code: `mindmap
  root((States of Matter))
    Primary States
      Solid Fixed Shape and Volume
      Liquid Fixed Volume Fluid
      Gas Expands to Fill Container
      Plasma Ionized High Energy
    Phase Transitions
      Melting Solid to Liquid
      Freezing Liquid to Solid
      Vaporization Liquid to Gas
      Condensation Gas to Liquid
      Sublimation Solid to Gas
      Deposition Gas to Solid
    Particle Behavior
      Kinetic Energy of Molecules
      Intermolecular Forces`
    };
  }

  // 11. Force, Motion & Newton's Laws
  if (/(?:newton|hukum\s*newton|force\s*(?:and|&)\s*motion|gaya\s*dan\s*gerak)/i.test(t)) {
    return {
      title: "Newton's Laws of Motion",
      summary: 'inertia, F=ma, action-reaction forces, and their real-world applications',
      code: `mindmap
  root((Newton's Laws of Motion))
    First Law Inertia
      Constant Velocity unless Net Force
      Object at Rest Stays at Rest
    Second Law F = ma
      Force Equals Mass Times Acceleration
      Greater Mass Requires Greater Force
    Third Law Action and Reaction
      Equal and Opposite Reaction
      Forces Occur in Pairs
    Types of Forces
      Gravity Weight
      Friction Resistance
      Normal Contact Force
      Tension and Applied Force`
    };
  }

  // 12. English Grammar & Parts of Speech
  if (/(?:grammar|parts\s*of\s*speech|tata\s*bahasa)/i.test(t)) {
    return {
      title: 'Parts of Speech',
      summary: 'core grammatical categories and sentence building blocks',
      code: `mindmap
  root((Parts of Speech))
    Content Words
      Nouns People Places Things
      Verbs Actions and States
      Adjectives Modifies Nouns
      Adverbs Modifies Verbs
    Structure Words
      Pronouns Replaces Nouns
      Prepositions Location and Time
      Conjunctions Connects Clauses
      Interjections Expresses Emotion
    Sentence Structure
      Subject and Predicate
      Independent Clauses
      Dependent Clauses`
    };
  }

  return null;
}
