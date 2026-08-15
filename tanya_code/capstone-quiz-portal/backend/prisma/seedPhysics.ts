import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Physics Knowledge Graph...');

  // ── 1. Clean only physics-related data ──────────────────────────────────
  const existing = await prisma.chapter.findFirst({ where: { name: 'Physics – Class 10' } });
  if (existing) {
    await prisma.chapter.delete({ where: { id: existing.id } });
    console.log('Removed old Physics chapter.');
  }

  // ── 2. Create chapter ────────────────────────────────────────────────────
  const chapter = await prisma.chapter.create({ data: { name: 'Physics – Class 10' } });

  // ── 3. Create topics ─────────────────────────────────────────────────────
  const topicNames = [
    'Measurement & Units',
    'Motion in a Straight Line',
    'Newton\'s Laws of Motion',
    'Work, Energy & Power',
    'Gravitation',
    'Electricity – Basic Concepts',
    'Ohm\'s Law & Resistance',
    'Series & Parallel Circuits',
    'Magnetic Effects of Current',
    'Light – Reflection',
    'Light – Refraction',
    'Human Eye & Optical Instruments',
    'Sound Waves',
    'Sources of Energy',
  ];

  const topicMap: Record<string, string> = {}; // name -> id

  for (const name of topicNames) {
    const topic = await prisma.topic.create({
      data: { name, chapterId: chapter.id },
    });
    topicMap[name] = topic.id;
    console.log(`  Created topic: ${name}`);
  }

  // ── 4. Wire prerequisite edges ───────────────────────────────────────────
  const edges: [string, string][] = [
    ['Measurement & Units',        'Motion in a Straight Line'],
    ['Motion in a Straight Line',  'Newton\'s Laws of Motion'],
    ['Newton\'s Laws of Motion',   'Work, Energy & Power'],
    ['Newton\'s Laws of Motion',   'Gravitation'],
    ['Work, Energy & Power',       'Sources of Energy'],
    ['Electricity – Basic Concepts','Ohm\'s Law & Resistance'],
    ['Ohm\'s Law & Resistance',    'Series & Parallel Circuits'],
    ['Electricity – Basic Concepts','Magnetic Effects of Current'],
    ['Light – Reflection',         'Light – Refraction'],
    ['Light – Refraction',         'Human Eye & Optical Instruments'],
    ['Motion in a Straight Line',  'Sound Waves'],
  ];

  for (const [prereqName, topicName] of edges) {
    await prisma.topicPrerequisite.create({
      data: {
        topicId:        topicMap[topicName],
        prerequisiteId: topicMap[prereqName],
      },
    });
    console.log(`  Linked: ${prereqName} → ${topicName}`);
  }

  // ── 5. Add study notes for each topic ────────────────────────────────────
  const notesMap: Record<string, { learnText: string; notes: string; examples: string; formula: string }> = {
    'Measurement & Units': {
      learnText: 'Measurement is the process of comparing a physical quantity with a standard unit. The SI system defines 7 base units used internationally.',
      notes: '• SI base units: metre (m), kilogram (kg), second (s), ampere (A), kelvin (K), mole (mol), candela (cd)\n• Derived units: N = kg·m/s², J = N·m, W = J/s\n• Significant figures indicate precision of measurement',
      examples: 'Speed of light: 3×10⁸ m/s\nMass of electron: 9.1×10⁻³¹ kg',
      formula: 'Error = Measured value − True value\nPercentage error = (Error/True value) × 100%',
    },
    'Motion in a Straight Line': {
      learnText: 'Motion is a change in position of an object with respect to time. When motion is confined to a straight line, it is called rectilinear motion.',
      notes: '• Distance: total path length (scalar)\n• Displacement: change in position (vector)\n• Speed = distance/time (scalar)\n• Velocity = displacement/time (vector)\n• Acceleration = change in velocity/time',
      examples: 'A car travels 60 km north then 20 km south. Distance = 80 km, Displacement = 40 km north.',
      formula: 'v = u + at\ns = ut + ½at²\nv² = u² + 2as\nAverage velocity = (u + v) / 2',
    },
    'Newton\'s Laws of Motion': {
      learnText: 'Newton\'s three laws explain how forces affect the motion of objects. They form the foundation of classical mechanics.',
      notes: '• 1st Law (Inertia): An object remains at rest or in uniform motion unless acted upon by a net external force\n• 2nd Law: F = ma — force equals mass times acceleration\n• 3rd Law: Every action has an equal and opposite reaction\n• Momentum: p = mv',
      examples: 'A 5 kg box accelerates at 2 m/s² when a force of 10 N is applied (F = 5 × 2 = 10 N).',
      formula: 'F = ma\np = mv\nImpulse = F × t = Δp',
    },
    'Work, Energy & Power': {
      learnText: 'Work is done when a force causes displacement. Energy is the capacity to do work. Power is the rate of doing work.',
      notes: '• Work W = F·d·cosθ (zero work if θ = 90°)\n• Kinetic Energy KE = ½mv²\n• Potential Energy PE = mgh\n• Law of conservation of energy: total mechanical energy remains constant\n• Power P = W/t',
      examples: 'A 2 kg ball falling from height 5 m: PE = 2×10×5 = 100 J. At bottom, KE = 100 J (conservation).',
      formula: 'W = F·d·cosθ\nKE = ½mv²\nPE = mgh\nP = W/t = F·v',
    },
    'Gravitation': {
      learnText: 'Every object in the universe attracts every other object. This universal force of attraction is called gravitation.',
      notes: '• Universal Law: F = Gm₁m₂/r²\n• G = 6.674×10⁻¹¹ N·m²/kg²\n• g = 9.8 m/s² on Earth\'s surface\n• g = GM/R² (varies with altitude)\n• Weight W = mg',
      examples: 'An object of mass 5 kg: Weight = 5 × 9.8 = 49 N on Earth, 49/6 ≈ 8.2 N on Moon.',
      formula: 'F = Gm₁m₂/r²\ng = GM/R²\nW = mg',
    },
    'Electricity – Basic Concepts': {
      learnText: 'Electric charge is the fundamental property of matter that causes it to experience electromagnetic force. Current is the flow of charges.',
      notes: '• Charge unit: Coulomb (C)\n• Current I = Q/t (Amperes)\n• Potential difference V = W/Q (Volts)\n• Conductor vs Insulator\n• EMF = work done per unit charge by battery',
      examples: 'If 10 C flows past a point in 2 s: I = 10/2 = 5 A',
      formula: 'I = Q/t\nV = W/Q\nQ = ne (n electrons, e = 1.6×10⁻¹⁹ C)',
    },
    'Ohm\'s Law & Resistance': {
      learnText: 'Ohm\'s Law states that the current through a conductor is directly proportional to the voltage across it, at constant temperature.',
      notes: '• V = IR (Ohm\'s Law)\n• Resistance R = ρL/A\n• ρ = resistivity (property of material)\n• R increases with temperature for metals\n• Resistors in series: R = R₁ + R₂ + ...',
      examples: 'A 12 V battery connected to a 6 Ω resistor: I = V/R = 12/6 = 2 A',
      formula: 'V = IR\nR = ρL/A\nP = VI = I²R = V²/R',
    },
    'Series & Parallel Circuits': {
      learnText: 'Components in a circuit can be connected in series (same current) or parallel (same voltage). Each arrangement has distinct properties.',
      notes: '• Series: same current, voltages add → Rₜ = R₁+R₂+R₃\n• Parallel: same voltage, currents add → 1/Rₜ = 1/R₁+1/R₂+1/R₃\n• Household wiring: parallel (independent switching)\n• Short circuit: very low resistance path',
      examples: '3 Ω and 6 Ω in parallel: 1/R = 1/3 + 1/6 = 3/6 → R = 2 Ω',
      formula: 'Series: Rₜ = R₁+R₂+...\nParallel: 1/Rₜ = 1/R₁+1/R₂+...\nVoltage divider: V₁ = V × R₁/(R₁+R₂)',
    },
    'Magnetic Effects of Current': {
      learnText: 'A current-carrying conductor produces a magnetic field around it. This is the principle behind electromagnets and electric motors.',
      notes: '• Right-hand thumb rule: thumb → current, fingers curl → field direction\n• Solenoid acts like a bar magnet\n• Force on conductor: F = BIL sinθ\n• Fleming\'s Left Hand Rule for motor action',
      examples: 'A wire carrying 3 A in a 0.5 T field at 90°, length 0.2 m: F = 0.5×3×0.2 = 0.3 N',
      formula: 'F = BIL sinθ\nB = μ₀I/2πr (straight wire)\nB = μ₀nI (solenoid)',
    },
    'Light – Reflection': {
      learnText: 'When light hits a surface and bounces back, it is called reflection. The laws of reflection govern the angle of incidence and reflection.',
      notes: '• Law 1: Angle of incidence = Angle of reflection\n• Law 2: Incident ray, normal, reflected ray are coplanar\n• Plane mirror: virtual, erect, same size, laterally inverted\n• Concave mirror: converging (used in headlights)\n• Convex mirror: diverging (rear-view mirror)',
      examples: 'Object 10 cm in front of concave mirror (f = 5 cm): 1/v + 1/u = 1/f → image at 10 cm (real, inverted)',
      formula: '1/v + 1/u = 1/f\nf = R/2\nm = -v/u (magnification)',
    },
    'Light – Refraction': {
      learnText: 'Refraction is the bending of light as it passes from one medium to another due to change in speed.',
      notes: '• Snell\'s Law: n₁sinθ₁ = n₂sinθ₂\n• Light bends toward normal when entering denser medium\n• Refractive index n = c/v\n• Total Internal Reflection when θ > critical angle\n• Lens formula: 1/v − 1/u = 1/f',
      examples: 'Light from air (n=1) to glass (n=1.5) at 30°: sin r = sin30°/1.5 = 0.5/1.5 → r ≈ 19.5°',
      formula: 'n₁sinθ₁ = n₂sinθ₂\nn = c/v\n1/f = 1/v − 1/u\nP = 1/f (Diopter)',
    },
    'Human Eye & Optical Instruments': {
      learnText: 'The human eye is a natural optical instrument. Its defects (myopia, hypermetropia, presbyopia) can be corrected with lenses.',
      notes: '• Cornea + lens focuses image on retina\n• Power of accommodation: ability to change focal length\n• Myopia (short-sightedness): concave lens\n• Hypermetropia (long-sightedness): convex lens\n• Dispersion by prism: VIBGYOR',
      examples: 'A person cannot see beyond 2 m. Power needed = −1/2 = −0.5 D (concave lens)',
      formula: 'P = 1/f (metres)\nFor myopia: P = 1/far point\nFor hypermetropia: P = 1/near point − 1/25',
    },
    'Sound Waves': {
      learnText: 'Sound is a mechanical wave that requires a medium to propagate. It travels as longitudinal waves through compression and rarefaction.',
      notes: '• Speed of sound in air ≈ 343 m/s at 20°C\n• Frequency range: 20 Hz to 20,000 Hz (audible)\n• Infrasound < 20 Hz; Ultrasound > 20,000 Hz\n• Reflection of sound: echo (distance > 17 m)\n• SONAR uses ultrasound for depth detection',
      examples: 'An echo is heard 2 s after a shout. Distance of wall = (343×2)/2 = 343 m',
      formula: 'v = fλ\nEcho distance = v×t/2\nDecibel: dB = 10 log(I/I₀)',
    },
    'Sources of Energy': {
      learnText: 'Energy sources are classified as renewable (solar, wind, hydro) and non-renewable (fossil fuels, nuclear). Sustainable choices are critical for the environment.',
      notes: '• Fossil fuels: coal, petroleum, natural gas (non-renewable)\n• Solar energy: photovoltaic cells convert light to electricity\n• Wind energy: turbines convert kinetic energy\n• Biomass, geothermal, tidal are other renewables\n• Nuclear fission releases enormous energy',
      examples: 'A solar panel of area 2 m² at 1000 W/m² with 20% efficiency: Power = 1000×2×0.2 = 400 W',
      formula: 'E = Pt\nEfficiency = (useful output/total input) × 100%\nE = mc² (nuclear)',
    },
  };

  for (const [name, content] of Object.entries(notesMap)) {
    if (topicMap[name]) {
      await prisma.topicContent.create({
        data: { topicId: topicMap[name], ...content },
      });
    }
  }
  console.log('Study notes created for all topics.');

  // ── 6. Create quizzes with real questions for each topic ─────────────────
  type QData = {
    text: string; optionA: string; optionB: string; optionC: string; optionD: string;
    correctAnswer: CorrectAnswer; difficulty: Difficulty;
  };

  const quizData: Record<string, { title: string; duration: number; difficulty: Difficulty; questions: QData[] }> = {
    'Measurement & Units': {
      title: 'Measurement & Units Quiz', duration: 180, difficulty: Difficulty.EASY,
      questions: [
        { text: 'What is the SI unit of force?', optionA: 'Newton', optionB: 'Joule', optionC: 'Watt', optionD: 'Pascal', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.EASY },
        { text: 'Which of the following is a fundamental quantity?', optionA: 'Speed', optionB: 'Force', optionC: 'Mass', optionD: 'Pressure', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'The number of significant figures in 0.00340 is:', optionA: '5', optionB: '3', optionC: '2', optionD: '6', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: '1 nanometre equals:', optionA: '10⁻⁶ m', optionB: '10⁻⁹ m', optionC: '10⁻¹² m', optionD: '10⁻³ m', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Dimensional formula of velocity is:', optionA: '[MLT⁻¹]', optionB: '[LT⁻¹]', optionC: '[ML⁻¹T]', optionD: '[L²T⁻²]', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Motion in a Straight Line': {
      title: 'Motion in a Straight Line Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'A car travels 40 m in 4 s. What is its average speed?', optionA: '8 m/s', optionB: '10 m/s', optionC: '16 m/s', optionD: '5 m/s', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Which equation of motion gives displacement when initial velocity, acceleration and time are known?', optionA: 'v = u + at', optionB: 'v² = u² + 2as', optionC: 's = ut + ½at²', optionD: 's = vt', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'A ball thrown vertically upward with 20 m/s. Time to reach maximum height (g = 10 m/s²):', optionA: '1 s', optionB: '4 s', optionC: '2 s', optionD: '5 s', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'The slope of a distance-time graph gives:', optionA: 'Acceleration', optionB: 'Speed', optionC: 'Displacement', optionD: 'Force', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'A body starts from rest and attains a velocity of 30 m/s in 5 s. Its acceleration is:', optionA: '5 m/s²', optionB: '150 m/s²', optionC: '6 m/s²', optionD: '3 m/s²', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Newton\'s Laws of Motion': {
      title: 'Newton\'s Laws of Motion Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'A net force of 15 N acts on a 3 kg object. What is the acceleration?', optionA: '45 m/s²', optionB: '5 m/s²', optionC: '3 m/s²', optionD: '18 m/s²', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Newton\'s first law defines the concept of:', optionA: 'Momentum', optionB: 'Inertia', optionC: 'Acceleration', optionD: 'Work', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'If action is 10 N to the right, the reaction is:', optionA: '10 N to the right', optionB: '20 N to the left', optionC: '10 N to the left', optionD: '5 N to the left', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Momentum of a 4 kg object moving at 6 m/s:', optionA: '10 kg·m/s', optionB: '24 kg·m/s', optionC: '1.5 kg·m/s', optionD: '20 kg·m/s', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'A rocket works on the principle of:', optionA: 'First law', optionB: 'Law of gravitation', optionC: 'Third law of motion', optionD: 'Bernoulli\'s theorem', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Work, Energy & Power': {
      title: 'Work, Energy & Power Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'Work done when force and displacement are perpendicular:', optionA: 'Maximum', optionB: 'Negative', optionC: 'Zero', optionD: 'Equal to force', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Kinetic energy of a 2 kg body moving at 4 m/s:', optionA: '8 J', optionB: '32 J', optionC: '16 J', optionD: '4 J', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'A machine does 500 J of work in 10 s. Its power is:', optionA: '5000 W', optionB: '50 W', optionC: '5 W', optionD: '500 W', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Potential energy of a 5 kg object at 3 m height (g = 10 m/s²):', optionA: '150 J', optionB: '50 J', optionC: '15 J', optionD: '300 J', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.EASY },
        { text: 'Which of these is NOT a unit of energy?', optionA: 'Joule', optionB: 'kWh', optionC: 'Watt', optionD: 'Calorie', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Gravitation': {
      title: 'Gravitation Quiz', duration: 240, difficulty: Difficulty.HARD,
      questions: [
        { text: 'The value of gravitational constant G is:', optionA: '9.8 N/kg', optionB: '6.674×10⁻¹¹ N·m²/kg²', optionC: '6.674×10¹¹ N·m²/kg²', optionD: '3×10⁸ m/s', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'Weight of a body is zero:', optionA: 'At the centre of Earth', optionB: 'At the equator', optionC: 'At the poles', optionD: 'On the Moon', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.HARD },
        { text: 'If Earth\'s radius doubles (mass constant), g becomes:', optionA: '4g', optionB: '2g', optionC: 'g/2', optionD: 'g/4', correctAnswer: CorrectAnswer.D, difficulty: Difficulty.HARD },
        { text: 'Gravitational force between two bodies is doubled if:', optionA: 'Distance doubles', optionB: 'Distance halves', optionC: 'One mass doubles, distance unchanged', optionD: 'Both A and C', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'What is the SI unit of gravitational potential energy?', optionA: 'Newton', optionB: 'Watt', optionC: 'Joule', optionD: 'Pascal', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
      ],
    },
    'Electricity – Basic Concepts': {
      title: 'Electricity Basics Quiz', duration: 180, difficulty: Difficulty.EASY,
      questions: [
        { text: 'The SI unit of electric current is:', optionA: 'Volt', optionB: 'Ohm', optionC: 'Ampere', optionD: 'Coulomb', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: '10 coulombs of charge flows in 5 seconds. Current is:', optionA: '50 A', optionB: '0.5 A', optionC: '2 A', optionD: '15 A', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Which particle carries electric current in metallic conductors?', optionA: 'Protons', optionB: 'Neutrons', optionC: 'Ions', optionD: 'Free electrons', correctAnswer: CorrectAnswer.D, difficulty: Difficulty.EASY },
        { text: 'Electric potential difference is measured in:', optionA: 'Ampere', optionB: 'Volt', optionC: 'Watt', optionD: 'Ohm', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'A charge of 1 C has how many electrons?', optionA: '1.6×10¹⁹', optionB: '6.25×10¹⁸', optionC: '9.1×10³¹', optionD: '1.6×10⁻¹⁹', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Ohm\'s Law & Resistance': {
      title: 'Ohm\'s Law & Resistance Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'Ohm\'s Law states V = IR. If V = 12 V and R = 4 Ω, find I:', optionA: '48 A', optionB: '8 A', optionC: '3 A', optionD: '16 A', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Resistance of a wire depends on:', optionA: 'Length only', optionB: 'Material, length and cross-section area', optionC: 'Current through it', optionD: 'Voltage across it', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'If the length of a wire is doubled and area halved, resistance becomes:', optionA: '2R', optionB: 'R/2', optionC: '4R', optionD: 'R', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.HARD },
        { text: 'The unit of resistivity is:', optionA: 'Ω/m', optionB: 'Ω·m', optionC: 'Ω/m²', optionD: 'Ω·m²', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'Power dissipated in a 10 Ω resistor carrying 2 A:', optionA: '20 W', optionB: '5 W', optionC: '40 W', optionD: '100 W', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Series & Parallel Circuits': {
      title: 'Series & Parallel Circuits Quiz', duration: 240, difficulty: Difficulty.HARD,
      questions: [
        { text: 'Three 6 Ω resistors in series. Total resistance:', optionA: '2 Ω', optionB: '18 Ω', optionC: '6 Ω', optionD: '3 Ω', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Two 6 Ω resistors in parallel. Total resistance:', optionA: '12 Ω', optionB: '6 Ω', optionC: '3 Ω', optionD: '1 Ω', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'In a parallel circuit, which quantity is the same across all branches?', optionA: 'Current', optionB: 'Resistance', optionC: 'Power', optionD: 'Voltage', correctAnswer: CorrectAnswer.D, difficulty: Difficulty.EASY },
        { text: 'Household appliances are connected in parallel because:', optionA: 'Less wire is needed', optionB: 'Each gets full supply voltage', optionC: 'Total resistance is high', optionD: 'Current is shared equally', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'A 12 V battery, 2 Ω and 4 Ω in series. Current through 4 Ω resistor:', optionA: '6 A', optionB: '3 A', optionC: '2 A', optionD: '4 A', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.HARD },
      ],
    },
    'Magnetic Effects of Current': {
      title: 'Magnetic Effects of Current Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'The rule used to find direction of magnetic field around a current-carrying wire:', optionA: 'Fleming\'s Left Hand Rule', optionB: 'Right-Hand Thumb Rule', optionC: 'Lenz\'s Law', optionD: 'Faraday\'s Rule', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'An electric motor converts:', optionA: 'Electrical to mechanical energy', optionB: 'Mechanical to electrical energy', optionC: 'Heat to electrical energy', optionD: 'Chemical to electrical energy', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.EASY },
        { text: 'Force on a conductor: F = BIL sinθ. If θ = 0°, force is:', optionA: 'Maximum', optionB: 'BIL', optionC: 'Zero', optionD: 'B²IL', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'A solenoid with current flowing through it behaves like a:', optionA: 'Capacitor', optionB: 'Bar magnet', optionC: 'Resistor', optionD: 'Diode', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'The principle of an electric generator is based on:', optionA: 'Magnetic effect of current', optionB: 'Heating effect of current', optionC: 'Electromagnetic induction', optionD: 'Chemical effect of current', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Light – Reflection': {
      title: 'Light Reflection Quiz', duration: 240, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'The angle of reflection equals the angle of:', optionA: 'Refraction', optionB: 'Incidence', optionC: 'Deviation', optionD: 'Dispersion', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'A concave mirror with radius of curvature 20 cm has focal length:', optionA: '20 cm', optionB: '5 cm', optionC: '40 cm', optionD: '10 cm', correctAnswer: CorrectAnswer.D, difficulty: Difficulty.EASY },
        { text: 'Which mirror is used as a rear-view mirror in vehicles?', optionA: 'Concave mirror', optionB: 'Plane mirror', optionC: 'Convex mirror', optionD: 'Parabolic mirror', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Mirror formula is:', optionA: '1/f = 1/v + 1/u', optionB: '1/f = 1/v − 1/u', optionC: 'f = v + u', optionD: 'f = v − u', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.MEDIUM },
        { text: 'Magnification m = −2 means the image is:', optionA: 'Virtual and same size', optionB: 'Real, inverted, 2× size', optionC: 'Virtual, erect, 2× size', optionD: 'Real, erect, 2× size', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.HARD },
      ],
    },
    'Light – Refraction': {
      title: 'Light Refraction Quiz', duration: 240, difficulty: Difficulty.HARD,
      questions: [
        { text: 'Snell\'s law states: n₁sinθ₁ =', optionA: 'n₂cosθ₂', optionB: 'n₂sinθ₂', optionC: 'n₁sinθ₂', optionD: 'n₂tanθ₂', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Refractive index of glass (speed of light in glass = 2×10⁸ m/s):', optionA: '1.0', optionB: '2.0', optionC: '1.5', optionD: '0.67', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'Total internal reflection occurs when light goes from:', optionA: 'Rarer to denser medium at any angle', optionB: 'Denser to rarer medium above critical angle', optionC: 'Rarer to denser above critical angle', optionD: 'Any medium at 90°', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'Power of a lens is +4 D. Its focal length is:', optionA: '4 m', optionB: '0.25 m', optionC: '25 m', optionD: '0.4 m', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'A convex lens forms a virtual image when the object is:', optionA: 'Beyond 2F', optionB: 'At F', optionC: 'Between F and lens', optionD: 'At 2F', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.HARD },
      ],
    },
    'Human Eye & Optical Instruments': {
      title: 'Human Eye Quiz', duration: 180, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'Which part of the eye controls the amount of light entering?', optionA: 'Retina', optionB: 'Cornea', optionC: 'Iris', optionD: 'Lens', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'A myopic person cannot see clearly beyond 1 m. Power of corrective lens:', optionA: '+1 D', optionB: '−1 D', optionC: '+2 D', optionD: '−2 D', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'The splitting of white light by a prism is called:', optionA: 'Reflection', optionB: 'Refraction', optionC: 'Dispersion', optionD: 'Diffraction', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Near point of a normal human eye is approximately:', optionA: '50 cm', optionB: '10 cm', optionC: '25 cm', optionD: 'infinity', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Presbyopia is corrected using:', optionA: 'Concave lens', optionB: 'Plane mirror', optionC: 'Bifocal lens', optionD: 'Convex mirror', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Sound Waves': {
      title: 'Sound Waves Quiz', duration: 180, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'Sound is a _______ wave.', optionA: 'Transverse', optionB: 'Electromagnetic', optionC: 'Longitudinal', optionD: 'Light', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'Speed of sound is maximum in:', optionA: 'Air', optionB: 'Water', optionC: 'Vacuum', optionD: 'Steel', correctAnswer: CorrectAnswer.D, difficulty: Difficulty.EASY },
        { text: 'Minimum distance from a wall to hear an echo (speed = 340 m/s):', optionA: '34 m', optionB: '17 m', optionC: '68 m', optionD: '8.5 m', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.MEDIUM },
        { text: 'The frequency of ultrasound is:', optionA: 'Less than 20 Hz', optionB: '20 Hz to 20 kHz', optionC: 'More than 20,000 Hz', optionD: 'Equal to 20 Hz', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'SONAR stands for:', optionA: 'Sound Navigation And Ranging', optionB: 'Sound Navigation And Recording', optionC: 'Sound And Noise Radar', optionD: 'Sonic Array Navigation', correctAnswer: CorrectAnswer.A, difficulty: Difficulty.MEDIUM },
      ],
    },
    'Sources of Energy': {
      title: 'Sources of Energy Quiz', duration: 180, difficulty: Difficulty.MEDIUM,
      questions: [
        { text: 'Which of the following is a renewable source of energy?', optionA: 'Coal', optionB: 'Petroleum', optionC: 'Solar energy', optionD: 'Natural gas', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.EASY },
        { text: 'A good fuel has:', optionA: 'Low calorific value', optionB: 'High calorific value and low pollution', optionC: 'High pollution', optionD: 'High ignition point', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'Nuclear energy is produced by:', optionA: 'Fusion of hydrogen only', optionB: 'Chemical reactions', optionC: 'Fission of heavy nuclei like Uranium', optionD: 'Combustion', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
        { text: 'Which device converts solar energy directly to electrical energy?', optionA: 'Solar heater', optionB: 'Photovoltaic cell', optionC: 'Biogas plant', optionD: 'Wind turbine', correctAnswer: CorrectAnswer.B, difficulty: Difficulty.EASY },
        { text: 'The main disadvantage of fossil fuels is:', optionA: 'High calorific value', optionB: 'Easy availability', optionC: 'Greenhouse gas emissions and non-renewability', optionD: 'Cheap cost', correctAnswer: CorrectAnswer.C, difficulty: Difficulty.MEDIUM },
      ],
    },
  };

  for (const [topicName, data] of Object.entries(quizData)) {
    if (!topicMap[topicName]) continue;
    await prisma.quiz.create({
      data: {
        title:       data.title,
        topicId:     topicMap[topicName],
        duration:    data.duration,
        isActive:    true,
        shuffle:     true,
        difficulty:  data.difficulty,
        questions: {
          create: data.questions,
        },
      },
    });
    console.log(`  Quiz created: ${data.title}`);
  }

  console.log('\nPhysics Knowledge Graph seeded successfully!');
  console.log(`  ${topicNames.length} topics | ${edges.length} prerequisite edges | ${Object.keys(quizData).length} quizzes`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
