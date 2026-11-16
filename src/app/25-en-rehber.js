// ---------------------------------------------------------------------------
// v52 — MOBİLİTE REHBERLERİ, KÜTÜPHANE NOTLARI VE HAREKET ADLARI (İngilizce; yalnızca gösterim).
// Kayıtlı değerler DEĞİŞMEZ: it.name, mobilityLog, rehber anahtarı (MOB_GUIDE), mobNorm hep Türkçe/ham.
// Tek istisna (karar 2): İngilizcede kütüphaneden YENİ eklenen hareketin notu İngilizce yazılır (mobAddLib).
// Not: t()/curLang bu dosyada üst düzeyde çağrılmaz (açılış async, EN sonradan dolar).
// ---------------------------------------------------------------------------
// Nasıl yapılır (anahtar = MOB_GUIDE anahtarı, MOB_LIB_V39 dahil; adım sayısı Türkçeyle aynı — test_v52_son denetler).
const MOB_GUIDE_EN = {
  "World’s Greatest Stretch": {
    steps: [
      "Take a long lunge step; keep your back knee straight and off the floor.",
      "Place the hand on the same side inside your front foot and lower that elbow towards the foot.",
      "Reach the same arm up to the ceiling and turn your chest; let your eyes follow your hand.",
      "Put the hand back down and switch sides."
    ],
    warn: "Do not let your back knee hit the floor; rotate with your breath, without forcing it."
  },
  "90/90 Hip Switch": {
    steps: [
      "Sit on the floor with both knees bent at 90 degrees: one in front, one to the side.",
      "Put your hands behind you and keep your torso upright.",
      "Slowly drop your knees to the other side into the opposite 90/90 position.",
      "Pause briefly at each switch and try to keep your torso tall."
    ],
    warn: "If your knee hurts, reduce the angle; do not force your knees to the floor."
  },
  "Kneeling Ankle Dorsiflexion": {
    steps: [
      "Kneel with one knee down and the other foot flat on the floor in front.",
      "Without lifting your heel, drive your knee forward over your toes.",
      "Hold the furthest point for 1–2 seconds, then come back.",
      "Repeat while guiding your knee slightly inwards and outwards."
    ],
    warn: "If your heel lifts, you went too far; stop if you feel a pinching pain at the front of the ankle."
  },
  "Quadruped Cat-Cow": {
    steps: [
      "Get on all fours with hands under shoulders and knees under hips.",
      "As you breathe in, push your chest forward, arch your lower back and lift your head slightly.",
      "As you breathe out, round your back towards the ceiling and bring your chin to your chest.",
      "Repeat slowly, spreading the movement through every part of your spine."
    ],
    warn: "If your lower back hurts, make the movement smaller; do not rush it."
  },
  "Towel/Band Shoulder Dislocates": {
    steps: [
      "Hold the towel or band in front of you with both hands, using a wide grip.",
      "Without bending your elbows, take your arms over your head and behind you.",
      "Bring them back to the front along the same path.",
      "If it feels easy, narrow your grip a little each set."
    ],
    warn: "If your shoulder feels a sharp or pinching pain, widen your grip; never force it through."
  },
  "Quadruped Thoracic Rotation (T-Spine)": {
    steps: [
      "Get on all fours and push your hips back slightly towards your heels.",
      "Place one hand behind your head.",
      "First bring that elbow down towards the opposite armpit, then open it up to the ceiling.",
      "Rotate from your chest and keep your lower back still."
    ],
    warn: "The movement should come from your upper back, not your lower back; keeping your hips back helps."
  },
  "Deep Squat Hold with Pry & Thoracic Reach": {
    steps: [
      "With feet shoulder-width apart, sink into the deepest squat that feels comfortable.",
      "Push your knees out gently with your elbows and rock your hips side to side.",
      "Reach one arm up to the ceiling and turn your torso that way, then switch arms.",
      "Keep your heels down and your back upright."
    ],
    warn: "If your heels lift, put something thin under them; if your knee hurts, reduce the depth."
  },
  "Scapular Push-Up & Wall Slides": {
    steps: [
      "In a push-up position with straight arms, squeeze your shoulder blades together, then spread them to push your upper back up.",
      "Then stand with your back against a wall and place your arms on it in a 'W' shape.",
      "Slide your arms up into a 'Y' without lifting them off the wall, then lower slowly."
    ],
    warn: "Keep your lower back on the wall and do not shrug your shoulders up to your ears."
  },
  "Cossack Squat (Dinamik Yan Lunge)": {
    steps: [
      "Take a wide stance with your toes turned slightly out.",
      "Shift your weight onto one leg and squat to the side by bending that knee; keep the other leg straight.",
      "The toes of your straight leg can point up to the ceiling; keep that heel down.",
      "Pass through the middle and lower to the other side."
    ],
    warn: "Do not let the bent knee cave in; go only as low as you can without pain."
  },
  "Leg Swings (Öne-Arkaya & Yana)": {
    steps: [
      "Hold a wall or post with one hand and stand on one leg.",
      "Swing your free leg forwards and backwards with control.",
      "Then face the wall and swing your leg side to side in front of your body.",
      "Increase the range a little with each swing."
    ],
    warn: "Do not fling your leg; keep your lower back still and move from the hip."
  },
  "Inchworm to Cobra Flow": {
    steps: [
      "Stand tall, then place your hands on the floor, keeping your knees as straight as you can.",
      "Walk your hands forward into a push-up position.",
      "Lower your hips to the floor and lift your chest into a cobra.",
      "Lift your hips and walk your hands back to stand up."
    ],
    warn: "If your hamstrings are very tight, bend your knees a little; in the cobra keep your shoulders away from your ears."
  },
  "Quadruped Hip CARs (Controlled Articular Rotations)": {
    steps: [
      "Get on all fours and brace your stomach lightly.",
      "Pull one knee in towards your chest.",
      "Open the knee out to the side, then draw a wide, slow circle backwards.",
      "Draw the circle in reverse too; keep your torso still."
    ],
    warn: "Move slowly; circle from the hip, not by twisting your lower back."
  },
  "Shoulder CARs (Ayakta Tam Daire)": {
    steps: [
      "Stand tall, lightly bracing your stomach and glutes.",
      "Raise one arm straight forward and up.",
      "Take it past your head, then back and down, drawing the widest circle you can.",
      "Draw the circle slowly in reverse too."
    ],
    warn: "Do not bend or twist your torso to make the circle bigger; if your shoulder feels a sharp pain, make the circle smaller."
  },
  "Thread the Needle (Dinamik)": {
    steps: [
      "Get on all fours.",
      "Reach one arm under the other to the opposite side, bringing your shoulder and temple towards the floor.",
      "Pull the same arm back and open it up to the ceiling; let your eyes follow your hand.",
      "Repeat in a slow flow, in time with your breath."
    ],
    warn: "Do not load your neck; do not rest your head's weight on the floor."
  },
  "Banded Pull-Apart & External Rotation": {
    steps: [
      "Hold the band at shoulder height with your arms straight in front of you.",
      "Squeeze your shoulder blades together and pull the band apart towards your chest, then return slowly.",
      "Then, with elbows bent at 90 degrees by your sides, rotate your forearms out to stretch the band."
    ],
    warn: "Do not shrug your shoulders up to your ears; control the band on the way back."
  },
  "Glute Bridge March": {
    steps: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Squeeze your glutes and lift your hips until your shoulders, hips and knees form a straight line.",
      "Without dropping your hips, lift one knee towards your chest, lower it and switch.",
      "Keep both sides of your hips at the same height."
    ],
    warn: "Do not over-arch your lower back; let your glutes carry the load."
  },
  "Doorway Pec & Biceps Stretch": {
    steps: [
      "Stand in a doorway and rest your forearm or palm on the frame at shoulder height.",
      "Step forward with the foot on the same side and push your chest forward as if going through the doorway.",
      "When you feel a stretch across your chest and the front of your shoulder, breathe and hold.",
      "Move your arm a little higher or lower to stretch different areas."
    ],
    warn: "If you feel a sharp pain or numbness at the front of your shoulder, step back."
  },
  "Child’s Pose with Lat Reach": {
    steps: [
      "Kneel and sit your hips back onto your heels.",
      "Reach your arms forward and lower your forehead to the floor.",
      "Walk your hands to one side; you will feel a stretch along the opposite side of your torso.",
      "Breathe out and reach a little further, then switch sides."
    ],
    warn: "If your knees hurt, widen them or put a cushion underneath."
  },
  "Couch Stretch": {
    steps: [
      "Place your back knee against the base of a wall, with your foot resting up the wall.",
      "Plant your front foot on the floor and slowly lift your torso upright.",
      "Squeeze your glutes and tilt your pelvis slightly forward.",
      "Breathe out and keep the stretch at the front of your hip."
    ],
    warn: "Do not arch your lower back; always put something soft under your knee."
  },
  "Supine Figure-4 Glute Stretch": {
    steps: [
      "Lie on your back and bend your knees.",
      "Place one ankle on the opposite knee (a figure 4).",
      "Hold behind the bottom leg and pull it towards your chest.",
      "When you feel a stretch in the back of your hip, breathe and hold."
    ],
    warn: "If your knee hurts, pull less; keep your head and shoulders on the floor."
  },
  "Single-Leg Seated Hamstring Stretch": {
    steps: [
      "Sit on the floor with one leg straight and the sole of the other foot against the inside of the straight leg.",
      "Keep your back straight and hinge forward from the hips, reaching your chest forward.",
      "Stop when you feel a stretch in the back of the straight leg, then breathe and hold."
    ],
    warn: "Do not round your back to reach your foot; stop if you feel a sharp pain behind the knee."
  },
  "Pigeon Pose (Güvercin Pozu)": {
    steps: [
      "From all fours, bring one knee forward towards the same hand; let your foot point towards the opposite hip.",
      "Extend your back leg straight behind you.",
      "Let your hips sink towards the floor, supporting yourself with your hands.",
      "If it feels comfortable, lean your torso forward."
    ],
    warn: "If your front knee hurts, bring your foot closer to your hip or do the figure 4 stretch on your back instead."
  },
  "Frog Stretch (Kurbağa Esnemesi)": {
    steps: [
      "Get on all fours and spread your knees as wide as is comfortable.",
      "Keep your ankles in line with your knees, feet turned out.",
      "Lower onto your forearms and slowly push your hips back.",
      "When you feel a stretch in your inner thighs, breathe and hold."
    ],
    warn: "Put something soft under your knees; if you feel a sharp pain in your groin, bring your knees closer."
  },
  "Half-Kneeling Hip Flexor Stretch": {
    steps: [
      "Kneel with one knee down and the other foot flat in front.",
      "Brace your stomach and gently tuck your tailbone under.",
      "Squeeze the glute of the back leg and shift your torso slightly forward.",
      "You can reach your arm up and lean slightly to the opposite side."
    ],
    warn: "Do not arch your lower back to move forward; the stretch should be at the front of your hip."
  },
  "Butterfly Groin Stretch": {
    steps: [
      "Sit on the floor, bring the soles of your feet together and pull your heels in.",
      "Hold your ankles and keep your back straight.",
      "Slowly let your knees drop towards the floor; you can press gently with your elbows.",
      "Reach your chest forward to deepen the stretch."
    ],
    warn: "Do not press hard on your knees; if you feel a sharp pain in your groin, ease off."
  },
  "Standing Wall Calf & Soleus Stretch": {
    steps: [
      "Place your hands on a wall with one foot back and that heel on the floor.",
      "With your back knee straight, push your hips towards the wall; you will feel the stretch high in the calf.",
      "Then bend your back knee slightly; the stretch moves lower, towards the Achilles.",
      "Breathe and hold in each position."
    ],
    warn: "Keep your back heel on the floor and your toes pointing forward."
  },
  "Overhead Triceps & Lat Side Lean Stretch": {
    steps: [
      "Stand and bend one arm over your head and behind you, dropping your hand down your back.",
      "With your other hand, pull the elbow behind your head.",
      "Lean your torso to the side you are pulling towards.",
      "When you feel a stretch in the back of your arm and the side of your torso, hold."
    ],
    warn: "Do not push your neck forward; as you lean, do not twist forwards or backwards."
  },
  "Cross-Body Posterior Shoulder Stretch": {
    steps: [
      "Bring one arm across the front of your chest to the other side.",
      "With your other arm, press it towards you from just above the elbow.",
      "Keep your shoulder down and away from your ear.",
      "When you feel a stretch at the back of your shoulder, hold."
    ],
    warn: "Do not press on the shoulder joint; apply the pressure above the elbow."
  },
  "Upper Trap & Levator Scapulae Neck Stretch": {
    steps: [
      "Sit tall and hold the edge of the chair with one hand.",
      "Tilt your head to the opposite side (upper traps).",
      "Then turn your nose towards the opposite armpit and tilt your head forward (levator).",
      "You can add very light pressure to your head with the other hand."
    ],
    warn: "Never pull or press on your neck; stop if you feel numbness or dizziness."
  },
  "Cobra / Sphinx Abdominal Stretch": {
    steps: [
      "Lie face down with your hands under your shoulders.",
      "Sphinx: with your forearms on the floor, slowly lift your chest.",
      "Cobra: straighten your arms to lift your chest higher; keep your hips on the floor.",
      "Keep your shoulders away from your ears, breathe and hold."
    ],
    warn: "If you feel a pinching pain in your lower back, stay in the sphinx or skip it."
  },
  "Supine Spinal Twist (Yatarak Omurga Rotasyonu)": {
    steps: [
      "Lie on your back with your arms out to the sides.",
      "Bend your knees and lower them together to one side, towards the floor.",
      "Turn your head the other way and keep your shoulders on the floor.",
      "Breathe out and relax, then switch sides."
    ],
    warn: "Do not force your knees to the floor; with a disc problem or nerve pain, keep it small and careful."
  },
  "Dead Hang (Barfikste Pasif Asılma)": {
    steps: [
      "Hold the pull-up bar at shoulder width, palms facing forward.",
      "Lift your feet off the floor, keep your arms straight and let your body hang.",
      "Relax your shoulders and keep your breathing steady.",
      "When you let go, land on your feet with control."
    ],
    warn: "Let go if your shoulder feels a sharp pain or your grip slips; with a shoulder injury, keep your shoulders slightly active."
  },
  "Thoracic Spine Foam Roll": {
    steps: [
      "Place the roller across your back, just below your shoulder blades.",
      "Clasp your hands behind your head and keep your hips on the floor.",
      "Extend your upper back back over the roller, then return.",
      "Move the roller a few centimetres at a time and repeat along your upper back."
    ],
    warn: "Do not move the roller down to your lower back; support your neck with your hands without pulling."
  },
  "Latissimus Dorsi Foam Roll": {
    steps: [
      "Lie on your side with the roller just below your armpit.",
      "Reach your bottom arm over your head, thumb pointing to the ceiling.",
      "Roll along the side of your back, turning your torso slightly forwards and backwards.",
      "Pause for a few breaths on tender spots."
    ],
    warn: "Do not press directly into your armpit or onto your ribs."
  },
  "Quadriceps & Hip Flexor Foam Roll": {
    steps: [
      "Lie face down on your forearms with the roller under the front of your thighs.",
      "Roll slowly from just below your hips to just above your knees.",
      "Shift your weight onto one leg to work deeper; pause on tender spots.",
      "You can bend your knee to increase the tension."
    ],
    warn: "Do not roll over your kneecap or hip bone; brace your stomach and do not arch your lower back."
  },
  "Glute / Piriformis Lacrosse Ball Release": {
    steps: [
      "Sit on the floor and place the ball under one glute, towards the outer back.",
      "Cross the ankle on that side over the opposite knee.",
      "Slowly lean your weight onto the ball and make small circles.",
      "Hold on a tender spot for 20–30 seconds and breathe out."
    ],
    warn: "If you feel tingling or numbness spreading down your leg, move the ball elsewhere."
  },
  "Plantar Fascia (Ayak Tabanı) Top Masajı": {
    steps: [
      "Standing or seated, place the ball under the sole of your foot.",
      "With controlled pressure, roll it from your heel to your toes.",
      "Pause for a few seconds in the middle of the arch and on tender spots."
    ],
    warn: "If you feel a sharp pain in the middle of your heel, ease the pressure; do it barefoot or in thin socks."
  },
  "Arm Circles (Kol Çevirme)": {
    steps: [
      "Stand and raise your arms out to the sides at shoulder height.",
      "Start with small circles and make them bigger with each turn.",
      "Circle 10 times forwards, then 10 times backwards."
    ],
    warn: "Do not shrug your shoulders up to your ears; if you feel a sharp pain, make the circles smaller."
  },
  "Hip Circles (Kalça Çevirme)": {
    steps: [
      "Stand with feet shoulder-width apart and hands on your hips.",
      "Slowly circle your hips in wide circles.",
      "Do 10 circles in one direction, then 10 in the other."
    ],
    warn: "Do not lock your knees; move from the hips and keep your head still."
  },
  "Walking Knee Hugs (Yürüyerek Diz Çekme)": {
    steps: [
      "Take a step, then hold the knee of your back leg with both hands and pull it to your chest.",
      "Rise onto the toes of your standing leg and hold for 1 second.",
      "Let go, step forward and repeat with the other leg."
    ],
    warn: "Keep your torso upright; if you lose your balance, do it near a wall."
  },
  "Walking Quad Pull (Yürüyerek Ön Bacak Çekme)": {
    steps: [
      "Take a step, then hold your back foot with the hand on the same side and pull it towards your glutes.",
      "Keep your knees side by side and squeeze your glutes slightly.",
      "Reach your other arm up and hold for 1–2 seconds, then switch legs."
    ],
    warn: "Do not arch your lower back; if your knee hurts, pull less."
  },
  "Spiderman Lunge with Rotation": {
    steps: [
      "From a push-up position, bring one foot to the outside of the hand on the same side.",
      "Let your hips sink and keep your back leg straight.",
      "Reach your inside arm up to the ceiling and turn your chest.",
      "Put the hand down, step the foot back and switch sides."
    ],
    warn: "Do not let your front knee cave in; rotate without forcing it."
  },
  "Hip Airplane (Kalça Uçağı)": {
    steps: [
      "Stand on one leg, lean your torso forward and extend your other leg behind you.",
      "Slowly open your torso and pelvis towards the floor (rotate).",
      "Then close back from the hip to return to the start."
    ],
    warn: "If you lose your balance, hold a wall with one hand; do not lock your standing knee."
  },
  "Ankle Circles (Ayak Bileği Çevirme)": {
    steps: [
      "Sit, or stand on one leg, and lift the other foot off the floor.",
      "Draw the widest circles you can with your ankle.",
      "Circle 10 times in one direction, then 10 times in the other."
    ],
    warn: "Move only from the ankle; keep your knee still."
  },
  "Calf Raises (Topuk Kaldırma)": {
    steps: [
      "Stand with feet hip-width apart; hold a wall if needed.",
      "Slowly raise your heels and hold on your toes for 1 second.",
      "Lower with control and press your heels fully into the floor."
    ],
    warn: "Do not roll your ankles outwards; keep your weight over your big toe."
  },
  "Bird Dog (Kuş-Köpek)": {
    steps: [
      "Get on all fours and brace your stomach lightly.",
      "Extend one arm forward and the opposite leg straight back.",
      "Hold for 2 seconds, lower with control and switch sides."
    ],
    warn: "Do not let your lower back arch or your hip turn out; do not lift your leg higher than needed."
  },
  "Dead Bug (Ölü Böcek)": {
    steps: [
      "Lie on your back with your arms to the ceiling and knees lifted at 90 degrees.",
      "Press your lower back into the floor and brace your stomach.",
      "Lower one arm overhead and extend the opposite leg forward.",
      "Return to the start and repeat on the other side."
    ],
    warn: "If your lower back lifts off the floor, lower your leg less."
  },
  "Prone Y-T-W Raises": {
    steps: [
      "Lie face down with your forehead on a towel.",
      "Reach your arms forward in a 'Y' shape, lift them slightly and lower.",
      "Then repeat in a 'T' (out to the sides) and a 'W' (elbows bent).",
      "With each lift, draw your shoulder blades back and down."
    ],
    warn: "Do not lift your neck; keep your eyes on the floor and do not shrug your shoulders up to your ears."
  },
  "Open Book (Yan Yatarak Göğüs Açma)": {
    steps: [
      "Lie on your side with knees bent at 90 degrees and arms stacked in front of you.",
      "Open your top arm up to the ceiling and over to the other side, like opening a book.",
      "Let your eyes follow your hand and keep your knees on the floor.",
      "Close back slowly."
    ],
    warn: "Do not force the rotation; if your shoulder feels a sharp pain, open your arm a little lower."
  },
  "Bodyweight Good Morning": {
    steps: [
      "Stand with feet hip-width apart and clasp your hands behind your head.",
      "Bend your knees slightly and push your hips back, keeping your back flat.",
      "When you feel a stretch in your hamstrings, squeeze your glutes and stand tall."
    ],
    warn: "Do not round your back; move from the hips, not the lower back."
  },
  "Jefferson Curl (Hafif)": {
    steps: [
      "Stand on the edge of a step with your knees straight.",
      "Tuck your chin to your chest and roll down one vertebra at a time, from the top of your spine.",
      "Breathe in at the bottom, then roll back up the same way, one vertebra at a time."
    ],
    warn: "Skip it if you have a lower back problem; train without weight for months before adding any, and go slowly."
  },
  "Walking Lunge with Overhead Reach": {
    steps: [
      "Take a long lunge step and lower your back knee towards the floor.",
      "Reach the arm on the side of your back leg overhead and lean slightly to the opposite side.",
      "Stand up and step forward with the other leg."
    ],
    warn: "Do not let your front knee travel far past your toes or cave in."
  },
  "Scorpion Stretch (Akrep)": {
    steps: [
      "Lie face down with your arms out to the sides in a T.",
      "Bend one knee and swing that leg across towards the opposite hand.",
      "Keep your chest and opposite shoulder on the floor, then return slowly."
    ],
    warn: "If you feel strain in your lower back, reduce the range; do not try to touch the floor with your foot."
  },
  "Sumo Squat to Stand": {
    steps: [
      "Take a wide stance, bend forward and hold your toes.",
      "Lower your hips into a deep squat and lift your chest.",
      "Raise your hips and straighten your knees without letting go of your toes.",
      "Stand up and repeat."
    ],
    warn: "Do not let your knees cave in; if your hamstrings are very tight, do not fully straighten your knees."
  },
  "Fire Hydrants": {
    steps: [
      "Get on all fours.",
      "Lift one knee out to the side, keeping it bent at 90 degrees.",
      "Keep your torso still and lower it slowly."
    ],
    warn: "Do not tilt your hips sideways to lift higher; keep your lower back still."
  },
  "Clamshells (İstiridye)": {
    steps: [
      "Lie on your side with knees bent and heels in line with your hips.",
      "Without separating your feet, open your top knee.",
      "Close it slowly; do not let your pelvis roll back."
    ],
    warn: "Move from the hip, not by twisting your lower back."
  },
  "Seated Thoracic Rotation": {
    steps: [
      "Sit tall on a chair with your arms crossed over your chest.",
      "Keeping your hips still, turn your torso to one side.",
      "Breathe out at the end of the turn, come back to the middle and turn to the other side."
    ],
    warn: "Rotate from your chest, not your neck; do not force it."
  },
  "Neck CARs (Boyun Çevirme)": {
    steps: [
      "Sit or stand tall and relax your shoulders.",
      "Bring your chin to your chest, then slowly roll your head to one side and back.",
      "Complete a slow, controlled full circle, then go the other way."
    ],
    warn: "Stop if you feel dizzy, numb or in pain; do not throw your head back."
  },
  "Wrist Circles & Rocks (Bilek Mobilitesi)": {
    steps: [
      "Interlace your fingers and circle your wrists in both directions.",
      "On all fours, place your palms on the floor.",
      "Slowly shift your weight forwards and backwards and side to side.",
      "Turn your hands around (fingers towards your knees) and gently repeat."
    ],
    warn: "If your wrist feels a sharp pain, put less weight on it."
  },
  "Heel & Toe Walks (Topuk ve Parmak Ucu Yürüyüşü)": {
    steps: [
      "Walk 20 steps on your toes, keeping your heels off the floor.",
      "Then walk 20 steps on your heels, with your toes in the air.",
      "Keep your steps short and controlled."
    ],
    warn: "If you lose your balance, walk alongside a wall."
  },
  "Kneeling Adductor Rock-Back": {
    steps: [
      "From all fours, extend one leg straight out to the side with the sole of your foot on the floor.",
      "Keep your back flat and push your hips back towards your heels.",
      "When you feel a stretch in your inner thigh, come back forward and repeat."
    ],
    warn: "Do not lock the knee of your extended leg; if you feel a sharp pain in your groin, reduce the angle."
  },
  "Gate Openers (Kalça Kapı Açma)": {
    steps: [
      "Stand and lift one knee forward and up.",
      "Open the knee out to the side and lower it (like opening a gate).",
      "Open outwards 8 times, then close inwards 8 times."
    ],
    warn: "Keep your torso upright; you can hold a wall for balance."
  },
  "Pelvic Tilts (Leğen Devirme)": {
    steps: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Brace your stomach and press your lower back into the floor (tilt your pelvis back).",
      "Then lift your lower back slightly off the floor (tilt your pelvis forward).",
      "Repeat slowly, with your breath."
    ],
    warn: "Keep the movement small; do not lift your hips off the floor."
  },
  "Prone Back Extension (Süpermen)": {
    steps: [
      "Lie face down with your arms stretched out in front.",
      "Squeeze your glutes and lift your chest and legs a few centimetres off the floor.",
      "Hold for 1–2 seconds, then lower with control."
    ],
    warn: "Do not throw your head back; if your lower back feels pinched, lift only your chest."
  },
  "Leg Cradle Walk": {
    steps: [
      "Take a step, then lift your back leg and hold the knee and ankle in your arms.",
      "Pull the leg across towards your chest, cradling it horizontally.",
      "Stand tall on your standing leg, hold for 1–2 seconds, then switch legs."
    ],
    warn: "Do not force your knee sideways; support the cradle from the ankle."
  },
  "Shoulder Taps & Scap Circles": {
    steps: [
      "Get into a push-up position and keep your hips still.",
      "Touch the opposite shoulder with one hand, put it back down and repeat with the other.",
      "Then, with straight arms, move your shoulder blades in circles."
    ],
    warn: "Do not let your hips sway side to side; if it is too hard, do it on your knees."
  },
  "Lizard Pose (Kertenkele)": {
    steps: [
      "From a lunge position, put your back knee on the floor.",
      "Move your front foot slightly out and place both hands inside it.",
      "Let your hips sink towards the floor; if it is comfortable, lower onto your forearms."
    ],
    warn: "Do not let your front knee fall outwards; if you feel a sharp pain in your groin, raise your hands."
  },
  "Standing Quad Stretch (Ayakta Ön Bacak)": {
    steps: [
      "Hold a wall with one hand and grab the foot on the same side with the other.",
      "Pull your heel towards your glutes, keeping your knees side by side.",
      "Push your hips slightly forward and hold."
    ],
    warn: "Do not arch your lower back; if your knee hurts, pull less or hold with a towel."
  },
  "Seated Forward Fold (Oturarak Öne Eğilme)": {
    steps: [
      "Sit on the floor with your legs straight out in front.",
      "Keeping your back straight, hinge forward from the hips.",
      "Place your hands as far as you can reach and go a little further with each breath out."
    ],
    warn: "Do not force your knees down; if you feel a sharp pain in your hamstrings, bend your knees slightly."
  },
  "Standing Forward Fold (Ayakta Öne Eğilme)": {
    steps: [
      "Stand with feet hip-width apart and knees slightly bent.",
      "Hinge forward from the hips and let your torso hang towards your legs.",
      "Let your arms hang or hold your elbows, and relax your head."
    ],
    warn: "Take care if you have high blood pressure or feel dizzy; roll up slowly when you stand."
  },
  "Supine Hamstring Strap Stretch": {
    steps: [
      "Lie on your back and loop a band or towel around the sole of one foot.",
      "Keeping the leg straight, raise it up while the other leg stays on the floor.",
      "Hold when you feel the stretch, and pull a little more with each breath out."
    ],
    warn: "Do not lift your lower back off the floor; if you feel a nerve pull behind the knee, reduce the angle."
  },
  "Wide-Leg Seated Straddle (Pancake)": {
    steps: [
      "Sit on the floor and spread your legs as wide as is comfortable.",
      "Point your toes to the ceiling and keep your back straight.",
      "Hinge forward from the hips and walk your hands forward on the floor."
    ],
    warn: "Do not round your back to go forward; sitting on a cushion makes it easier to lean forward."
  },
  "Happy Baby (Mutlu Bebek)": {
    steps: [
      "Lie on your back and pull your knees to your chest.",
      "Turn the soles of your feet to the ceiling and hold the outside edges of your feet.",
      "Lower your knees towards your armpits and rock gently side to side."
    ],
    warn: "Keep your head and back on the floor; if it is hard, hold your ankles instead."
  },
  "Knees to Chest (Dizleri Göğse Çekme)": {
    steps: [
      "Lie on your back and pull both knees to your chest.",
      "Wrap your arms around your knees and rest your head on the floor.",
      "As you breathe out, rock gently side to side."
    ],
    warn: "If your knees hurt, hold behind them instead."
  },
  "Seated Spinal Twist (Oturarak Omurga Rotasyonu)": {
    steps: [
      "Sit on the floor with one leg straight; plant the other foot outside the straight leg.",
      "Place the opposite elbow outside the bent knee.",
      "Put your other hand behind you, sit tall and rotate your torso."
    ],
    warn: "Sit tall first, then rotate; do not force the turn from your neck."
  },
  "Puppy Pose (Yavru Köpek)": {
    steps: [
      "From all fours, walk your hands forward, keeping your hips over your knees.",
      "Let your chest sink towards the floor and rest your forehead on the floor.",
      "Keep your arms long and lower your chest a little more with each breath."
    ],
    warn: "If your shoulder feels a sharp pain, place your hands wider; do not over-arch your lower back."
  },
  "Sleeper Stretch (Uyku Esnemesi)": {
    steps: [
      "Lie on your side with your bottom arm forward at shoulder height and the elbow bent at 90 degrees.",
      "With your other hand, slowly press the bottom forearm towards the floor.",
      "When you feel a light stretch at the back of your shoulder, hold."
    ],
    warn: "Press very gently; if the front of your shoulder feels a sharp pain, let go immediately."
  },
  "Towel Behind Back Shoulder Stretch": {
    steps: [
      "Hold a towel in one hand and let it hang over your head and down your back.",
      "Hold the bottom end of the towel at waist height with your other hand.",
      "Pull the towel up with your top hand to raise the bottom hand; then switch directions."
    ],
    warn: "If your shoulder feels a sharp pain, pull less; do not jerk."
  },
  "Bench Prayer Stretch (Kanat Esnetme)": {
    steps: [
      "Kneel in front of a bench, rest your elbows on it and press your palms together.",
      "Push your hips back and let your head drop between your arms.",
      "You can bend your hands back towards your neck to deepen the stretch."
    ],
    warn: "Do not over-arch your lower back; if your shoulder feels pinched, widen your elbows a little."
  },
  "Chin Tucks & Neck Flexion": {
    steps: [
      "Sit tall and draw your chin straight back (make a double chin).",
      "In this position, tilt your head slightly forward.",
      "When you feel a stretch at the back of your neck, hold; you can add very light support with your hand."
    ],
    warn: "Do not press or pull on your neck; stop if you feel numbness or dizziness."
  },
  "Wrist Flexor & Extensor Stretch": {
    steps: [
      "Extend your arm straight in front of you, palm facing up.",
      "With your other hand, pull your fingers down and towards you, and hold.",
      "Then turn your palm down and pull the back of your hand towards you, and hold."
    ],
    warn: "If your wrist feels a sharp pain or numbness, pull less."
  },
  "Kneeling Shin Stretch (Kaval Önü)": {
    steps: [
      "Sit back on your knees with the tops of your feet on the floor and toes pointing back.",
      "Place your hands behind you and try to slowly lift your knees off the floor.",
      "When you feel a stretch across the top of your feet and the front of your shins, hold."
    ],
    warn: "If your knees hurt, put a cushion underneath; do not force your ankles."
  },
  "Toe Sit (Parmak Esnetme)": {
    steps: [
      "Kneel with your toes tucked under on the floor.",
      "Slowly lower your hips onto your heels.",
      "When you feel a stretch in the soles of your feet, hold, supporting yourself with your hands on the floor."
    ],
    warn: "It is very intense; start with a few seconds and build up the time slowly."
  },
  "Reclined Butterfly (Yatarak Kelebek)": {
    steps: [
      "Lie on your back, bring the soles of your feet together and let your knees fall to the sides.",
      "Relax your arms by your sides and settle your lower back into the floor.",
      "As you breathe out, let your knees sink under their own weight."
    ],
    warn: "If your groin feels a pull, put cushions under your knees."
  },
  "Standing Side Bend (Yana Eğilme)": {
    steps: [
      "Stand with feet hip-width apart and reach one arm overhead.",
      "Lean your torso to the opposite side.",
      "Push your hips slightly the other way and feel the stretch along the side of your torso."
    ],
    warn: "Do not twist forwards or backwards; lean only to the side."
  },
  "Low Lunge (Alçak Hamle)": {
    steps: [
      "In a lunge position, put your back knee on the floor.",
      "Rest your hands on your front knee and lift your torso upright.",
      "Slowly let your hips sink forward and down; you can reach your arms overhead."
    ],
    warn: "Do not arch your lower back; put something soft under your back knee."
  },
  "Seated Figure-4 (Sandalyede Kalça)": {
    steps: [
      "Sit tall on a chair and place one ankle on the opposite knee.",
      "Keeping your back straight, hinge forward from the hips.",
      "When you feel a stretch in the back of your hip, hold."
    ],
    warn: "If your knee hurts, do not force the top knee down."
  },
  "Downward Dog (Aşağı Bakan Köpek)": {
    steps: [
      "From all fours, lift your hips up and back into an upside-down V.",
      "Push the floor away with your hands and look between your arms.",
      "Let your heels sink towards the floor; bend your knees slightly if needed."
    ],
    warn: "Do not round your back; if your shoulders or wrists hurt, lower onto your forearms."
  },
  "Camel Pose (Deve, Hafif)": {
    steps: [
      "Kneel upright and place your hands on the back of your waist.",
      "Push your hips forward and lift your chest to lean back slightly.",
      "If comfortable, lower your hands to your heels; keep your head in line with your spine."
    ],
    warn: "Skip it if you have a lower back problem; lean back from your chest, not your lower back, and come up slowly."
  },
  "Bear Hug Upper Back Stretch": {
    steps: [
      "Cross your arms in front of your chest and hug yourself.",
      "Grab your shoulder blades with your hands and pull them forward.",
      "Round your back, lower your chin slightly and breathe in."
    ],
    warn: "Do not push your neck forward; keep your shoulders relaxed."
  },
  "Doorway Hamstring Stretch (Kapı Eşiğinde)": {
    steps: [
      "Lie on your back in a doorway.",
      "Rest one leg straight up against the door frame; let the other pass through the doorway and lie on the floor.",
      "Adjust the stretch by moving your hips closer to the frame, then relax."
    ],
    warn: "Keep your lower back on the floor; if you feel a sharp pain behind the knee, move away."
  },
  "Pec Stretch on Foam Roller (Göğüs Açma)": {
    steps: [
      "Place the roller lengthwise along your spine and lie on it on your back.",
      "Keep your head and hips on the roller, with your knees bent.",
      "Open your arms out to the sides, palms facing up, and let gravity do the work."
    ],
    warn: "If your hands tingle, lower your arms a little."
  },
  "Calf Stretch on Step (Basamakta Baldır)": {
    steps: [
      "Stand with the balls of your feet on the edge of a step and hold the handrail.",
      "Slowly lower one heel below the step.",
      "Hold with your knee straight, then repeat with it slightly bent."
    ],
    warn: "Do not drop your heel suddenly; if your Achilles hurts, reduce the depth."
  },
  "Calf Foam Roll (Baldır)": {
    steps: [
      "Sit on the floor with the roller under your calf and lift your hips with your hands.",
      "Roll slowly from your ankle to just below your knee.",
      "Turn your foot in and out to work the edges of the calf too."
    ],
    warn: "Do not roll behind your knee."
  },
  "Hamstring Foam Roll (Arka Bacak)": {
    steps: [
      "Sit on the floor with the roller under the back of your thigh, supporting yourself with your hands.",
      "Roll slowly from just below your glutes to just above your knee.",
      "Turn your leg in and out to work different areas."
    ],
    warn: "Do not press behind your knee or on your sit bone."
  },
  "Adductor Foam Roll (İç Bacak)": {
    steps: [
      "Lie face down on your forearms and open one leg out to the side like a frog.",
      "Place the roller under your inner thigh, parallel to the floor.",
      "Roll slowly from beside your knee towards your groin."
    ],
    warn: "Do not get too close to your groin; adjust the pressure with your forearms."
  },
  "TFL & Outer Thigh Foam Roll (Dış Bacak)": {
    steps: [
      "Lie on your side with the roller just below and in front of your hip bone.",
      "Plant your top leg in front of you to adjust the weight.",
      "Roll slowly from the side of your hip to the middle of your thigh."
    ],
    warn: "The outer thigh is very sensitive; reduce the pressure with your top foot and do not roll over your knee."
  },
  "Glute Foam Roll (Kalça)": {
    steps: [
      "Sit on the roller and place one ankle on the opposite knee.",
      "Shift your weight onto the glute you are working.",
      "Roll with small movements over the upper and outer part of the glute."
    ],
    warn: "If you feel numbness spreading down your leg, change position."
  },
  "Pec Ball Release (Göğüs Topla)": {
    steps: [
      "Place the ball below your collarbone, at the front of your shoulder.",
      "Face a wall and pin the ball between the wall and your chest.",
      "Make small circles; you can slowly move your arm up and down."
    ],
    warn: "Do not press on your collarbone or into your armpit."
  },
  "Upper Trap Ball Release (Trapez Topla)": {
    steps: [
      "Stand with your back to a wall and place the ball on the muscle between your neck and shoulder.",
      "Bend your knees slightly to roll the ball up and down.",
      "Pause on a tender spot and tilt your head slightly to the opposite side."
    ],
    warn: "Do not press on your spine or neck."
  },
  "Thoracic Two-Ball Release (Sırt İki Top)": {
    steps: [
      "Put two balls in a sock or hold them side by side.",
      "Lie on your back with the balls on either side of your spine, level with your shoulder blades.",
      "Cross your arms over your chest, lift your hips and roll slowly up and down."
    ],
    warn: "Do not move the balls down to your lower back; never place them directly on your spine."
  },
  "Infraspinatus Ball Release (Kürek Kemiği)": {
    steps: [
      "Place the ball on the flat part of your shoulder blade and lean your back against a wall.",
      "Reach your arm across the front of your chest.",
      "Make small circles and pause on tender spots."
    ],
    warn: "Do not let it slide onto your spine; if your arm goes numb, move the ball."
  },
  "Tibialis Foam Roll (Kaval Önü)": {
    steps: [
      "On all fours, place the front of one shin on the roller.",
      "Position the roller on the outer side of the shinbone (the muscle side).",
      "Roll slowly from your ankle to just below your knee."
    ],
    warn: "Do not press directly on the shinbone."
  },
  "Forearm Ball Release (Ön Kol)": {
    steps: [
      "Rest your forearm on a table with the ball underneath.",
      "Press gently on your forearm with the other hand and roll from wrist to elbow.",
      "Pause on tender spots and open and close your fingers."
    ],
    warn: "Do not press on the sensitive area on the inside of the wrist or on the elbow bone."
  }
};
// Kütüphane notları (anahtar = MOBILITY_LIBRARY + MOB_LIB_V39 Türkçe notu).
const MOB_NOTE_EN = {
  "Kalça, torasik omurga ve hamstring kompleksi": "Hips, thoracic spine and hamstrings",
  "Kalça iç ve dış rotasyon mobilitesi": "Hip internal and external rotation",
  "Squat derinliği için ayak bileği mobilitesi": "Ankle mobility for squat depth",
  "Omurga segmentasyonu ve nefes uyumu": "Spinal segmentation and breathing rhythm",
  "Omuz kapsülü ve pektoral açılış": "Shoulder capsule and chest opener",
  "Üst sırt rotasyonel açıklık": "Upper back rotation",
  "Kalça ve ayak bileği açma": "Opens hips and ankles",
  "Serratus anterior ve skapula kontrolü": "Serratus anterior and shoulder blade control",
  "Adductor (iç bacak) ve kalça mobilitesi": "Adductors (inner thigh) and hip mobility",
  "Dinamik kalça ısınması": "Dynamic hip warm-up",
  "Arka zincir ve omuz stabilitesi": "Posterior chain and shoulder stability",
  "Kalça eklem kapsülü kontrolü": "Hip joint capsule control",
  "Omuz eklem sağlığı": "Shoulder joint health",
  "Torasik rotasyon ve arka omuz": "Thoracic rotation and rear shoulder",
  "Rotator manşet (Rotator Cuff) aktivasyonu": "Rotator cuff activation",
  "Kalça aktivasyonu ve pelvik stabilite": "Glute activation and pelvic stability",
  "Omuz ısınması": "Shoulder warm-up",
  "Kalça ve bel ısınması": "Hip and lower back warm-up",
  "Kalça ve arka bacak ısınması": "Hip and hamstring warm-up",
  "Ön bacak ve kalça önü": "Quads and front of the hip",
  "Kalça ve üst sırt akışı": "Hip and upper back flow",
  "Kalça rotasyon kontrolü ve denge": "Hip rotation control and balance",
  "Ayak bileği ısınması": "Ankle warm-up",
  "Baldır ve ayak bileği aktivasyonu": "Calf and ankle activation",
  "Gövde ve bel stabilitesi": "Core and lower back stability",
  "Karın ve bel kontrolü": "Abs and lower back control",
  "Kürek kemiği ve arka omuz aktivasyonu": "Shoulder blade and rear shoulder activation",
  "Üst sırt rotasyonu ve göğüs açılımı": "Upper back rotation and chest opener",
  "Kalça menteşesi ve arka bacak": "Hip hinge and hamstrings",
  "Omurga ve arka bacak esnekliği (ağırlıksız ya da çok hafif)": "Spine and hamstring flexibility (no weight or very light)",
  "Kalça önü ve yan gövde açılımı": "Hip flexor and side body opener",
  "Kalça önü ve omurga rotasyonu": "Hip flexor and spinal rotation",
  "İç bacak, arka bacak ve kalça": "Inner thigh, hamstrings and hips",
  "Kalça dış rotasyonu ve yan kalça": "Hip external rotation and outer hip",
  "Yan kalça aktivasyonu": "Outer hip activation",
  "Üst sırt rotasyonu (oturarak)": "Upper back rotation (seated)",
  "Boyun eklem hareketliliği": "Neck mobility",
  "Bilek ve ön kol (şınav, press öncesi)": "Wrists and forearms (before push-ups and presses)",
  "Ayak bileği ve kaval önü": "Ankles and shins",
  "İç bacak ve kalça": "Inner thigh and hips",
  "Kalça dış rotasyonu ısınması": "Hip external rotation warm-up",
  "Bel ve leğen kontrolü": "Lower back and pelvic control",
  "Sırt ekstansörleri ve kalça": "Back extensors and glutes",
  "Kalça dış rotasyonu ve kalça arkası": "Hip external rotation and glutes",
  "Omuz stabilitesi ve kürek kemiği kontrolü": "Shoulder stability and shoulder blade control",
  "Göğüs ve ön omuz gerginliğini açar": "Opens up a tight chest and front shoulder",
  "Kanat (Latissimus) ve bel esnetme": "Lats and lower back stretch",
  "Rectus femoris ve psoas (kalça fleksörü) esnetme": "Rectus femoris and psoas (hip flexor) stretch",
  "Piriformis ve derin kalça esnetme": "Piriformis and deep hip stretch",
  "Arka bacak uzatma": "Hamstring lengthening",
  "Derin glute ve dış kalça esnetme": "Deep glute and outer hip stretch",
  "İç bacak (Adductor) ve kasık esnetme": "Inner thigh (adductors) and groin stretch",
  "Posterior pelvik tilt ile kalça önü esnetme": "Hip flexor stretch with a posterior pelvic tilt",
  "Oturarak ayak tabanları birleşik iç bacak esnetme": "Seated inner thigh stretch with the soles of the feet together",
  "Diz düz (Gastrocnemius) ve diz bükülü (Soleus)": "Straight knee (gastrocnemius) and bent knee (soleus)",
  "Triceps uzun başı ve yan gövde": "Triceps long head and side body",
  "Arka omuz kapsülü esnetme": "Rear shoulder capsule stretch",
  "Boyun ve üst trapez gevşetme": "Neck and upper trap release",
  "Karın ve ön zincir esnetme": "Abs and front body stretch",
  "Bel ve omurga dekompresyonu": "Lower back and spinal decompression",
  "Omuz sağlığı ve omurga dekompresyonu": "Shoulder health and spinal decompression",
  "Kalça önü ve iç kalça": "Hip flexors and inner hip",
  "Ön bacak": "Quads",
  "Arka bacak ve sırt": "Hamstrings and back",
  "Arka bacak ve bel gevşetme": "Hamstring and lower back release",
  "Arka bacak (sırt üstü, bantla)": "Hamstrings (on your back, with a band)",
  "İç bacak ve arka bacak": "Inner thigh and hamstrings",
  "Kalça ve bel gevşetme": "Hip and lower back release",
  "Bel gevşetme": "Lower back release",
  "Omurga rotasyonu ve kalça dışı": "Spinal rotation and outer hip",
  "Omuz, kanat ve göğüs açılımı": "Shoulders, lats and chest opener",
  "Arka omuz kapsülü (iç rotasyon)": "Rear shoulder capsule (internal rotation)",
  "Omuz iç rotasyonu ve göğüs önü": "Shoulder internal rotation and front of the chest",
  "Latissimus ve üst sırt": "Lats and upper back",
  "Boyun arkası ve duruş": "Back of the neck and posture",
  "Ön kol ve bilek": "Forearms and wrists",
  "Ayak sırtı ve kaval önü": "Top of the foot and shins",
  "Ayak parmakları ve ayak tabanı": "Toes and soles of the feet",
  "İç bacak ve kalça gevşetme": "Inner thigh and hip release",
  "Yan gövde ve kanat": "Side body and lats",
  "Kalça önü (psoas)": "Hip flexors (psoas)",
  "Kalça arkası (oturarak, iş yerinde)": "Back of the hip (seated, at your desk)",
  "Arka bacak, baldır ve omuz": "Hamstrings, calves and shoulders",
  "Göğüs ve kalça önü açılımı": "Chest and hip flexor opener",
  "Kürek kemikleri arası ve üst sırt": "Between the shoulder blades and upper back",
  "Arka bacak (pasif, uzun süreli)": "Hamstrings (passive, long hold)",
  "Göğüs ve omuz önü (pasif)": "Chest and front shoulder (passive)",
  "Baldır ve aşil": "Calves and Achilles",
  "Üst sırt ekstansiyonu": "Upper back extension",
  "Koltuk altı ve yan sırt": "Armpit and side of the back",
  "Ön bacak miyofasyal gevşetme": "Quad myofascial release",
  "Tetik nokta gevşetme": "Trigger point release",
  "Ayak tabanı fasyası": "Plantar fascia (sole of the foot)",
  "Baldır miyofasyal gevşetme": "Calf myofascial release",
  "Arka bacak gevşetme": "Hamstring release",
  "İç bacak gevşetme": "Inner thigh release",
  "Kalça yanı ve dış uyluk": "Side of the hip and outer thigh",
  "Kalça kasları gevşetme": "Glute release",
  "Göğüs ve omuz önü gevşetme": "Chest and front shoulder release",
  "Üst trapez ve boyun-omuz arası": "Upper traps and neck-shoulder area",
  "Omurga yanı (üst sırt) gevşetme": "Release along the spine (upper back)",
  "Arka omuz ve kürek kemiği üstü": "Rear shoulder and back of the shoulder blade",
  "Kaval kemiği yanı kaslar": "Muscles beside the shinbone",
  "Ön kol ve kavrama kasları": "Forearm and grip muscles"
};
// Türkçe parantezli kütüphane adları (v51 EX_EN kuralı: adın kendisi İngilizce kalır; parantez kaldırılır ya da anlamı İngilizce yazılır).
const MOB_NAME_EN = {
  "Cossack Squat (Dinamik Yan Lunge)": "Cossack Squat (Dynamic Side Lunge)",
  "Leg Swings (Öne-Arkaya & Yana)": "Leg Swings (Front to Back and Side to Side)",
  "Shoulder CARs (Ayakta Tam Daire)": "Shoulder CARs (Standing Full Circle)",
  "Thread the Needle (Dinamik)": "Thread the Needle (Dynamic)",
  "Arm Circles (Kol Çevirme)": "Arm Circles",
  "Hip Circles (Kalça Çevirme)": "Hip Circles",
  "Walking Knee Hugs (Yürüyerek Diz Çekme)": "Walking Knee Hugs",
  "Walking Quad Pull (Yürüyerek Ön Bacak Çekme)": "Walking Quad Pull",
  "Hip Airplane (Kalça Uçağı)": "Hip Airplane",
  "Ankle Circles (Ayak Bileği Çevirme)": "Ankle Circles",
  "Calf Raises (Topuk Kaldırma)": "Calf Raises",
  "Bird Dog (Kuş-Köpek)": "Bird Dog",
  "Dead Bug (Ölü Böcek)": "Dead Bug",
  "Open Book (Yan Yatarak Göğüs Açma)": "Open Book (Side-Lying Chest Opener)",
  "Jefferson Curl (Hafif)": "Jefferson Curl (Light)",
  "Scorpion Stretch (Akrep)": "Scorpion Stretch",
  "Clamshells (İstiridye)": "Clamshells",
  "Neck CARs (Boyun Çevirme)": "Neck CARs (Neck Circles)",
  "Wrist Circles & Rocks (Bilek Mobilitesi)": "Wrist Circles and Rocks",
  "Heel & Toe Walks (Topuk ve Parmak Ucu Yürüyüşü)": "Heel and Toe Walks",
  "Gate Openers (Kalça Kapı Açma)": "Gate Openers (Hip)",
  "Pelvic Tilts (Leğen Devirme)": "Pelvic Tilts",
  "Prone Back Extension (Süpermen)": "Prone Back Extension (Superman)",
  "Pigeon Pose (Güvercin Pozu)": "Pigeon Pose",
  "Frog Stretch (Kurbağa Esnemesi)": "Frog Stretch",
  "Supine Spinal Twist (Yatarak Omurga Rotasyonu)": "Supine Spinal Twist",
  "Dead Hang (Barfikste Pasif Asılma)": "Dead Hang (Passive Hang from a Bar)",
  "Lizard Pose (Kertenkele)": "Lizard Pose",
  "Standing Quad Stretch (Ayakta Ön Bacak)": "Standing Quad Stretch",
  "Seated Forward Fold (Oturarak Öne Eğilme)": "Seated Forward Fold",
  "Standing Forward Fold (Ayakta Öne Eğilme)": "Standing Forward Fold",
  "Happy Baby (Mutlu Bebek)": "Happy Baby",
  "Knees to Chest (Dizleri Göğse Çekme)": "Knees to Chest",
  "Seated Spinal Twist (Oturarak Omurga Rotasyonu)": "Seated Spinal Twist",
  "Puppy Pose (Yavru Köpek)": "Puppy Pose",
  "Sleeper Stretch (Uyku Esnemesi)": "Sleeper Stretch",
  "Bench Prayer Stretch (Kanat Esnetme)": "Bench Prayer Stretch (Lats)",
  "Kneeling Shin Stretch (Kaval Önü)": "Kneeling Shin Stretch",
  "Toe Sit (Parmak Esnetme)": "Toe Sit (Toe Stretch)",
  "Reclined Butterfly (Yatarak Kelebek)": "Reclined Butterfly",
  "Standing Side Bend (Yana Eğilme)": "Standing Side Bend",
  "Low Lunge (Alçak Hamle)": "Low Lunge",
  "Seated Figure-4 (Sandalyede Kalça)": "Seated Figure-4 (Chair Hip Stretch)",
  "Downward Dog (Aşağı Bakan Köpek)": "Downward Dog",
  "Camel Pose (Deve, Hafif)": "Camel Pose (Gentle)",
  "Doorway Hamstring Stretch (Kapı Eşiğinde)": "Doorway Hamstring Stretch",
  "Pec Stretch on Foam Roller (Göğüs Açma)": "Pec Stretch on Foam Roller (Chest Opener)",
  "Calf Stretch on Step (Basamakta Baldır)": "Calf Stretch on Step",
  "Plantar Fascia (Ayak Tabanı) Top Masajı": "Plantar Fascia Ball Massage (Sole of the Foot)",
  "Calf Foam Roll (Baldır)": "Calf Foam Roll",
  "Hamstring Foam Roll (Arka Bacak)": "Hamstring Foam Roll",
  "Adductor Foam Roll (İç Bacak)": "Adductor Foam Roll (Inner Thigh)",
  "TFL & Outer Thigh Foam Roll (Dış Bacak)": "TFL and Outer Thigh Foam Roll",
  "Glute Foam Roll (Kalça)": "Glute Foam Roll",
  "Pec Ball Release (Göğüs Topla)": "Pec Ball Release (Chest)",
  "Upper Trap Ball Release (Trapez Topla)": "Upper Trap Ball Release",
  "Thoracic Two-Ball Release (Sırt İki Top)": "Thoracic Two-Ball Release (Upper Back)",
  "Infraspinatus Ball Release (Kürek Kemiği)": "Infraspinatus Ball Release (Shoulder Blade)",
  "Tibialis Foam Roll (Kaval Önü)": "Tibialis Foam Roll (Shin)",
  "Forearm Ball Release (Ön Kol)": "Forearm Ball Release"
};
let _mobGuideEnIdx = null;
// Rehber (gösterim): Türkçede mobGuide aynen; İngilizcede İngilizce rehber, yoksa Türkçe rehber.
function mobGuideL(name) {
  const g = mobGuide(name);
  if (!g || curLang() !== "en") return g;
  if (!_mobGuideEnIdx) { _mobGuideEnIdx = {}; Object.keys(MOB_GUIDE_EN).forEach(k => { _mobGuideEnIdx[mobNorm(k).trim()] = MOB_GUIDE_EN[k]; }); }
  return _mobGuideEnIdx[mobNorm(name).trim()] || g;
}
// Hareket adı (gösterim). Yalnızca tablodaki kütüphane adları; kullanıcının yazdığı ad aynen döner.
function mobNameL(name) {
  if (curLang() !== "en") return name;
  const k = String(name == null ? "" : name).trim();
  return Object.prototype.hasOwnProperty.call(MOB_NAME_EN, k) ? MOB_NAME_EN[k] : name;
}
// Kütüphane notu (gösterim / İngilizcede yeni kayıt). Bilinmeyen metin (kullanıcının kendi notu) aynen döner.
function mobNoteL(note) {
  if (curLang() !== "en") return note;
  const k = String(note == null ? "" : note).trim();
  return Object.prototype.hasOwnProperty.call(MOB_NOTE_EN, k) ? MOB_NOTE_EN[k] : note;
}

// ---------------------------------------------------------------------------
// v52 görev 2 — Hakkında (Hesap yöntemi, kaynaklar, lisanslar, gizlilik), antrenman paylaşım kartı. Sesli yönlendirme anahtarları 22'de.
// Sayılar yer tutucuyla gelir (renderAbout: Türkçe "1,55", İngilizce "1.55"); etiketler/kaynak adları özel ad olarak kalır.
// ---------------------------------------------------------------------------
Object.assign(EN, {
  // --- Hakkında
  "Verilerin yalnızca bu telefonda; uygulamanın bir sunucusu yok. Barkod okuttuğunda barkod numarası Open Food Facts'e gönderilir; bu istekle telefonun internet adresi (IP) de onlara ulaşır.": "Your data stays on this phone only; the app has no server. When you scan a barcode, the barcode number is sent to Open Food Facts, and your phone's internet address (IP) reaches them with that request.",
  "Günlük harcama.": "Daily energy use.",
  "Dinlenirken harcadığın enerji Mifflin-St Jeor denklemiyle bulunur. Yağ oranını girdiysen bunun yerine yağsız kütleye dayalı Katch-McArdle denklemi kullanılır. Sonra hareketlilik çarpanıyla çarpılır.": "The energy you burn at rest comes from the Mifflin-St Jeor equation. If you entered your body fat, the Katch-McArdle equation, which is based on lean mass, is used instead. The result is then multiplied by your activity factor.",
  "Hareketlilik çarpanları": "Activity factors",
  "(antrenman günü · dinlenme günü): az hareketli {l0} · {l1}, orta {m0} · {m1}, çok hareketli {h0} · {h1}.": "(workout day · rest day): low activity {l0} · {l1}, moderate {m0} · {m1}, high {h0} · {h1}.",
  "Hedef kalori.": "Calorie target.",
  "Kilo verirken seçtiğin açık kadar düşülür. Kilo alırken harcamanın %{s} (yavaş), %{m} (orta) ya da %{f} (hızlı) kadarı eklenir. Korurken harcamana eşittir. Hedef kalori güvenli alt sınırın altına inmez: kadında {kadin}, erkekte {erkek} kcal.": "When losing weight, the deficit you chose is subtracted. When gaining, {s}% (slow), {m}% (moderate) or {f}% (fast) of your energy use is added. When maintaining, it equals your energy use. The calorie target never goes below the safe minimum: {kadin} kcal for women, {erkek} kcal for men.",
  "Protein.": "Protein.",
  "Kilo başına hesaplanır. Hesapta kullanılan kilo, mevcut kilonla hedef kilonun küçüğüdür; böylece kilolu biri gereğinden fazla protein almaz.": "It is calculated per kilogram of body weight. The weight used is the smaller of your current weight and your target weight, so someone carrying extra weight does not get more protein than needed.",
  "Kilo verirken: yağ oranın biliniyorsa yağsız kütlenin her kilosu için {a} g, bilinmiyorsa {b} g.": "When losing weight: {a} g per kilogram of lean mass if your body fat is known, otherwise {b} g per kilogram of body weight.",
  "Kilo korurken: {a} g.": "When maintaining: {a} g.",
  "Kilo alırken: {a} g.": "When gaining: {a} g.",
  "Toplam, mevcut kilonun {a} katını geçmez. \"Yüksek\" seçeneğini açarsan en az mevcut kilonun 2 katı olur.": "The total never exceeds {a} times your current weight. If you turn on \"High\", it is at least 2 times your current weight.",
  "Yağ ve karbonhidrat.": "Fat and carbohydrate.",
  "Yağ kalorinin %25'i, karbonhidrat kalan kaloridir; en az 60 g olur.": "Fat is 25% of the calories and carbohydrate is whatever remains; it is at least 60 g.",
  "Bunlar ortalama kişiler için tahminlerdir; kendi sonuçlarına göre ayarla.": "These are estimates for average people; adjust them to your own results.",
  "Kaynaklar": "Sources",
  "Mifflin ve ark. (1990), Mifflin-St Jeor denklemi": "Mifflin et al. (1990), Mifflin-St Jeor equation",
  "Katch-McArdle denklemi (yağsız kütleye dayalı)": "Katch-McArdle equation (based on lean mass)",
  "Morton ve ark. 2018, Br J Sports Med (protein ve kas)": "Morton et al. 2018, Br J Sports Med (protein and muscle)",
  "Nunes ve ark. 2022, J Cachexia Sarcopenia Muscle (protein ve kas)": "Nunes et al. 2022, J Cachexia Sarcopenia Muscle (protein and muscle)",
  "ISSN Pozisyon Bildirisi 2017 (Jäger ve ark.)": "ISSN Position Stand 2017 (Jäger et al.)",
  "Helms ve ark. 2014 (kilo verirken protein)": "Helms et al. 2014 (protein while losing weight)",
  "Iraki ve ark. 2019 (kilo alırken beslenme)": "Iraki et al. 2019 (nutrition while gaining weight)",
  "Joslin Klinik Beslenme Rehberi": "Joslin Clinical Nutrition Guideline",
  "AMDR: yağ kalorinin %20–35'i": "AMDR: fat is 20–35% of calories",
  "Whittaker ve Wu 2021 (bazal metabolizma denklemleri)": "Whittaker and Wu 2021 (basal metabolic rate equations)",
  "Open Food Facts verisi (ODbL; ürün verisi katkıcılara ait)": "Open Food Facts data (ODbL; product data belongs to its contributors)",
  "USDA FoodData Central (kamu malı / CC0)": "USDA FoodData Central (public domain / CC0)",
  "Vücut haritası görseli (uygulama sahibinin kendi görseli)": "Body map image (the app owner's own artwork)",
  // --- antrenman paylaşım kartı (tuval + pencere)
  "Antrenman tamamlandı": "Workout complete", "Antrenman|kart": "Workout",
  "Süre|kart": "Time", "Tonaj|kart": "Volume", "Rekor|kart": "PRs", "Kardiyo|kart": "Cardio", "Set|kart": "Sets", "Hareket|kart": "Exercises", "Hareketler|kart": "Exercises",
  "AYK+ ile kaydedildi": "Logged with AYK+",
  "{c} × {s} sn|kart": "{c} × {s} sec",
  "{n} set • en iyi {kg}×{r}": { one: "{n} set • best {kg}×{r}", other: "{n} sets • best {kg}×{r}" },
  "{n} set • {r} tekrar": { one: "{n} set • {r} reps", other: "{n} sets • {r} reps" },
  "Antrenman Özeti": "Workout summary", "Antrenman özeti": "Workout summary",
  "Kart hazırlanıyor...": "Preparing card...",
  "Paylaş / Fotoğraflara Kaydet": "Share / Save to Photos",
  "Paylaş menüsünden Instagram, WhatsApp veya \"Görüntüyü Kaydet\"i seçebilirsin.": "From the share menu you can pick Instagram, WhatsApp or \"Save Image\".",
  "Kart oluşturulamadı.": "Could not create the card.",
  "AYK+ Antrenman": "AYK+ Workout", "Görsel indirildi": "Image downloaded",
  "Paylaşılamadı. Görsele basılı tutup kaydedebilirsin.": "Could not share. Press and hold the image to save it."
});
