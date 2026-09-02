import fs from 'node:fs';
const need=['index.html','app-manifest.js','auth-gate.js','v10/api.js','v10/app.js','v10/styles.css'];
for(const f of need){if(!fs.existsSync(f))throw new Error(`Missing ${f}`)}
const index=fs.readFileSync('index.html','utf8');
if(!index.includes('/v10/styles.css'))throw new Error('v10 stylesheet not loaded');
if(/app-[1-6]\.js|media-evolution|cloud-evolution|ux-unifier/.test(index))throw new Error('Legacy runtime still referenced by index');
const manifest=fs.readFileSync('app-manifest.js','utf8');
if(!manifest.includes('v10/api.js')||!manifest.includes('v10/app.js'))throw new Error('Clean modules missing from manifest');
if(/app-[1-6]\.js/.test(manifest))throw new Error('Legacy bundles still active');
const api=fs.readFileSync('v10/api.js','utf8');
for(const token of ['exercises','image_url','workout_items','workout_sessions','workout_sets','exercise_notes','exercise_substitutions','measurements','weekly_checkins','goals','progress_photos','nutrition_plans','nutrition_days','meals','meal_items','calendar_events','notifications','coach_athletes','coach_notes'])if(!api.includes(token))throw new Error(`API missing ${token}`);
const app=fs.readFileSync('v10/app.js','utf8');
for(const token of ['openWorkout','exerciseLibrary','startWorkout','saveRow','finishWorkout','showWarmup','showHistory','editExerciseNote','substituteExercise','renderProgress','newMeasurement','newCheckin','newGoal','renderNutrition','generateNutritionDay','calendarView','notificationsView','coachView','backupData','image_url'])if(!app.includes(token))throw new Error(`App missing ${token}`);
const css=fs.readFileSync('v10/styles.css','utf8');
for(const token of ['modalBack','exerciseTools','photoGrid','notification','smartInline'])if(!css.includes(token))throw new Error(`CSS missing ${token}`);
console.log('PT-PRO v10 native smoke: OK');