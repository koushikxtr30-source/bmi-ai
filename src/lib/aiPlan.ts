import type {
  Dashboard, SharedInputs, UnitSystem, ActivityLevel,
  AIPlan, DietOption, ExerciseDay, Milestone,
} from '@/types'

export function generateAIPlan(
  dashboard: Dashboard,
  inputs: SharedInputs,
  unitSystem: UnitSystem,
  activityLevel: ActivityLevel,
): AIPlan {
  const bmi = dashboard.bmi?.bmi ?? 22
  const category = dashboard.bmi?.category ?? 'normal'
  const tdee = dashboard.tdee?.tdee ?? dashboard.bmr?.bmr ?? 2000
  const wUnit = unitSystem === 'metric' ? 'kg' : 'lbs'
  const age = parseInt(inputs.age) || 30
  const sex = inputs.sex

  const goal: 'lose' | 'maintain' | 'gain' =
    category === 'underweight' ? 'gain' :
    category === 'normal' ? 'maintain' : 'lose'

  const goalLabel = goal === 'lose' ? 'Lose Weight' : goal === 'gain' ? 'Gain Weight' : 'Maintain & Tone'

  const summary = goal === 'lose'
    ? `Based on your BMI of ${bmi}, a gradual calorie deficit with consistent exercise will help you reach a healthy weight. Aim for 0.5–1 ${wUnit}/week loss.`
    : goal === 'gain'
    ? `Your BMI of ${bmi} suggests you're underweight. A moderate calorie surplus with strength training will help you build healthy mass.`
    : `Your BMI of ${bmi} is in the healthy range. Focus on body composition, maintaining weight, and building fitness.`

  const lossCals = Math.round(tdee - 500)
  const gainCals = Math.round(tdee + 300)
  const targetCals = goal === 'lose' ? lossCals : goal === 'gain' ? gainCals : tdee

  const p = Math.round(targetCals * (goal === 'lose' ? 0.35 : 0.30) / 4)
  const c = Math.round(targetCals * (goal === 'lose' ? 0.35 : goal === 'gain' ? 0.45 : 0.40) / 4)
  const f = Math.round(targetCals * (goal === 'lose' ? 0.30 : goal === 'gain' ? 0.25 : 0.30) / 9)

  const dietOptions: DietOption[] = [
    {
      name: 'Mediterranean', emoji: '🫒',
      description: 'Heart-healthy, sustainable, rich in whole foods and healthy fats.',
      calories: targetCals,
      macros: { protein: p, carbs: Math.round(c * 1.1), fat: Math.round(f * 1.0) },
      foods: ['Olive oil', 'Fish & seafood', 'Legumes', 'Whole grains', 'Vegetables', 'Nuts & seeds', 'Greek yogurt'],
      avoid: ['Processed meats', 'Refined sugars', 'Highly processed foods'],
      tag: 'Most Sustainable',
    },
    {
      name: 'High Protein', emoji: '🥩',
      description: 'Preserves muscle during weight loss, increases satiety.',
      calories: targetCals,
      macros: { protein: Math.round(p * 1.4), carbs: Math.round(c * 0.8), fat: Math.round(f * 0.9) },
      foods: ['Chicken breast', 'Eggs', 'Greek yogurt', 'Cottage cheese', 'Lean beef', 'Tofu', 'Whey protein'],
      avoid: ['Sugary drinks', 'White bread', 'Fried foods'],
      tag: goal === 'lose' ? 'Best for Fat Loss' : 'Best for Muscle Gain',
    },
    {
      name: 'Low Carb', emoji: '🥗',
      description: 'Reduces insulin spikes, effective for fat loss and blood sugar.',
      calories: targetCals,
      macros: { protein: Math.round(p * 1.2), carbs: Math.round(c * 0.4), fat: Math.round(f * 1.5) },
      foods: ['Avocado', 'Eggs', 'Leafy greens', 'Nuts', 'Cheese', 'Fatty fish', 'Cauliflower rice'],
      avoid: ['Bread & pasta', 'Rice', 'Sugar', 'Starchy vegetables', 'Beer'],
      tag: 'Best for Quick Results',
    },
    {
      name: 'Plant-Based', emoji: '🌱',
      description: 'Fiber-rich, anti-inflammatory, environmentally conscious.',
      calories: targetCals,
      macros: { protein: Math.round(p * 0.9), carbs: Math.round(c * 1.2), fat: Math.round(f * 0.9) },
      foods: ['Lentils', 'Chickpeas', 'Tofu & tempeh', 'Quinoa', 'Nuts & seeds', 'Oats', 'Berries'],
      avoid: ['All animal products', 'Processed vegan junk food'],
      tag: 'Eco-Friendly',
    },
  ]

  const isDeconditioned = category === 'obese' || activityLevel === 'sedentary'

  const exerciseRoutine: ExerciseDay[] = goal === 'lose' ? [
    { day: 'Monday',    type: 'Cardio',            intensity: isDeconditioned ? 'Low' : 'Moderate', duration: isDeconditioned ? '20 min' : '35 min', exercises: isDeconditioned ? ['Brisk walking', 'Seated marching', 'Light cycling'] : ['Brisk walking / jogging', 'Cycling or elliptical', 'Jump rope (modified)'], rest: false },
    { day: 'Tuesday',   type: 'Strength',          intensity: 'Moderate', duration: '30 min', exercises: ['Bodyweight squats 3×12', 'Push-ups (modified ok) 3×10', 'Dumbbell rows 3×12', 'Glute bridges 3×15'], rest: false },
    { day: 'Wednesday', type: 'Active Recovery',   intensity: 'Low',      duration: '20 min', exercises: ['Yoga or stretching', 'Light walk', 'Foam rolling'], rest: false },
    { day: 'Thursday',  type: 'Cardio + Core',     intensity: isDeconditioned ? 'Low' : 'Moderate', duration: isDeconditioned ? '25 min' : '40 min', exercises: isDeconditioned ? ['Walking', 'Seated ab crunches', 'Side bends'] : ['Treadmill intervals', 'Plank 3×30s', 'Bicycle crunches 3×15', 'Mountain climbers 3×20'], rest: false },
    { day: 'Friday',    type: 'Full Body Strength', intensity: 'Moderate', duration: '35 min', exercises: ['Lunges 3×12', 'Incline push-ups 3×10', 'Lat pulldown / band row 3×12', 'Shoulder press 3×12'], rest: false },
    { day: 'Saturday',  type: 'Fun Activity',      intensity: 'Moderate', duration: '45 min', exercises: ['Swimming', 'Hiking', 'Dance class', 'Sports — pick what you enjoy!'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',          intensity: '—', duration: '—', exercises: ['Full rest or gentle walk', 'Prep meals for the week'], rest: true },
  ] : goal === 'gain' ? [
    { day: 'Monday',    type: 'Upper Body Push',  intensity: 'High',     duration: '45 min', exercises: ['Bench press 4×8', 'Overhead press 3×10', 'Incline dumbbell press 3×10', 'Tricep dips 3×12'], rest: false },
    { day: 'Tuesday',   type: 'Lower Body',       intensity: 'High',     duration: '45 min', exercises: ['Squats 4×8', 'Romanian deadlift 3×10', 'Leg press 3×12', 'Calf raises 4×15'], rest: false },
    { day: 'Wednesday', type: 'Rest / Cardio',    intensity: 'Low',      duration: '20 min', exercises: ['Light walk', 'Stretching', 'Foam rolling'], rest: false },
    { day: 'Thursday',  type: 'Upper Body Pull',  intensity: 'High',     duration: '45 min', exercises: ['Deadlift 4×5', 'Pull-ups or lat pulldown 4×8', 'Barbell rows 3×10', 'Bicep curls 3×12'], rest: false },
    { day: 'Friday',    type: 'Full Body',        intensity: 'Moderate', duration: '40 min', exercises: ['Power cleans 3×5', 'Dips 3×10', 'Bulgarian split squat 3×10', 'Face pulls 3×15'], rest: false },
    { day: 'Saturday',  type: 'Active Recovery',  intensity: 'Low',      duration: '30 min', exercises: ['Light cardio', 'Mobility work', 'Yoga'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',         intensity: '—', duration: '—', exercises: ['Full rest', 'Eat in calorie surplus'], rest: true },
  ] : [
    { day: 'Monday',    type: 'Strength',        intensity: 'Moderate', duration: '40 min', exercises: ['Compound lifts: squat, bench, row', 'Progressive overload focus'], rest: false },
    { day: 'Tuesday',   type: 'Cardio',          intensity: 'Moderate', duration: '30 min', exercises: ['Running / cycling / rowing', 'Zone 2 heart rate (60–70% max)'], rest: false },
    { day: 'Wednesday', type: 'Strength',        intensity: 'Moderate', duration: '40 min', exercises: ['Deadlift, overhead press, pull-ups', 'Accessory work'], rest: false },
    { day: 'Thursday',  type: 'Active Recovery', intensity: 'Low',      duration: '20 min', exercises: ['Yoga', 'Stretching', 'Light walk'], rest: false },
    { day: 'Friday',    type: 'Strength + HIIT', intensity: 'High',     duration: '45 min', exercises: ['Full body strength circuit', '10 min HIIT finisher'], rest: false },
    { day: 'Saturday',  type: 'Outdoor / Sport', intensity: 'Moderate', duration: '45 min', exercises: ['Hiking', 'Cycling', 'Sport of choice'], rest: false },
    { day: 'Sunday',    type: 'Rest Day',        intensity: '—', duration: '—', exercises: ['Full rest', 'Meal prep'], rest: true },
  ]

  const targetBMI = category === 'underweight' ? 20 : category === 'normal' ? bmi : 24
  const heightStr = inputs.height || '170'
  const heightFt = parseFloat(inputs.heightFt) || 5
  const heightInch = inputs.heightIn !== '' ? parseFloat(inputs.heightIn) : 7
  const heightM = unitSystem === 'metric'
    ? parseFloat(heightStr) / 100
    : ((heightFt * 12) + heightInch) * 0.0254
  const weightFactor = unitSystem === 'metric' ? 1 : 2.20462
  const targetWeightKg = targetBMI * heightM * heightM
  const targetWeight = Math.round(targetWeightKg * weightFactor * 10) / 10
  const weightDiffKg = Math.abs(targetWeightKg - (parseFloat(inputs.weight) || 70) / (unitSystem === 'imperial' ? 2.20462 : 1))
  const weeklyChangeKg = goal === 'maintain' ? 0 : goal === 'lose' ? 0.5 : 0.25
  const weeksToGoal = goal === 'maintain' ? 0 : Math.ceil(weightDiffKg / weeklyChangeKg)
  const weeklyChange = Math.round(weeklyChangeKg * weightFactor * 10) / 10

  const milestones: Milestone[] = goal === 'maintain' ? [
    { week: 2,  label: '🏁 Start',         target: 'Establish baseline', action: 'Log your weight daily for 2 weeks' },
    { week: 6,  label: '💪 Habit Lock-in', target: 'Exercise 3×/week',  action: 'Schedule workouts, treat them as appointments' },
    { week: 12, label: '🎯 Body Recomp',   target: 'Reduce body fat %', action: 'Prioritize protein & strength training' },
  ] : [
    { week: 2, label: '🏁 Week 2', target: `Lose ${(weeklyChange * 2).toFixed(1)} ${wUnit}`, action: 'Set up your meal plan and exercise schedule' },
    { week: Math.round(weeksToGoal * 0.25), label: '⚡ 25% Progress', target: `${(Math.round(weightDiffKg * 0.25 * weightFactor * 10) / 10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Review and adjust plan if progress stalls' },
    { week: Math.round(weeksToGoal * 0.5),  label: '🔥 Halfway',     target: `${(Math.round(weightDiffKg * 0.5  * weightFactor * 10) / 10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Take progress photos, reassess macros' },
    { week: Math.round(weeksToGoal * 0.75), label: '🌟 75% There',   target: `${(Math.round(weightDiffKg * 0.75 * weightFactor * 10) / 10)} ${wUnit} ${goal === 'lose' ? 'lost' : 'gained'}`, action: 'Stay consistent, plan maintenance phase' },
    { week: weeksToGoal, label: '🏆 Goal!', target: `Reach ${targetWeight} ${wUnit}`, action: 'Transition to maintenance plan' },
  ]

  const habits = [
    goal === 'lose' ? '🥤 Drink 2–3L water daily — reduces hunger and boosts metabolism' : '🥤 Drink 2.5–3L water daily to support muscle protein synthesis',
    '😴 Sleep 7–9 hours — poor sleep increases cortisol and hunger hormones',
    goal === 'lose' ? '🍽️ Eat slowly and stop at 80% full (hara hachi bu)' : '🍽️ Eat 4–5 smaller meals spread throughout the day',
    '🚶 Add 7,000–10,000 steps daily — even without gym sessions',
    goal === 'lose' ? '📊 Track food for at least 4 weeks to build macro awareness' : '📊 Track protein intake — aim for 1.6–2.2g per kg of bodyweight',
    sex === 'male' ? '🧘 Manage stress — high cortisol increases belly fat storage' : '🧘 Manage stress — cortisol can cause weight fluctuations and cravings',
    age >= 50 ? '🦴 Prioritize weight-bearing exercise to maintain bone density' : '⏱️ Avoid sitting for more than 60 min — set a movement reminder',
    '🌅 Eat most of your calories earlier in the day for better metabolic function',
  ]

  return {
    goal, goalLabel, summary, dietOptions, exerciseRoutine,
    timeline: { currentBMI: bmi, targetBMI, targetWeight, weeksToGoal, weeklyChange, milestones },
    habits,
    generatedBy: 'rule-based',
  }
}
