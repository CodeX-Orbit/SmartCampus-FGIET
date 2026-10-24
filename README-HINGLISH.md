# SmartCampus Pro — Setup Guide (Hinglish)

## Project mein kya hai?
1. Better dashboard + statistics
2. Events/deadlines schedule list
3. Admin panel: notice/event add, edit, delete
4. Firebase Authentication: student sign up/sign in
5. Firestore shared data
6. Lost & Found reports, search, mark resolved
7. Saved notices, search/category filters, dark mode, responsive UI

## Step 1 — Firebase project banao
1. https://console.firebase.google.com/ kholo aur Google account se sign in karo.
2. Add project par click karo.
3. Project banne ke baad Web app (`</>`) add karo.
4. Firebase config copy karke `firebase-config.js` mein placeholders replace karo.
5. Authentication > Sign-in method > Email/Password enable karo.
6. Firestore Database > Create database par jao.
7. `firestore.rules` ka content Firestore > Rules mein paste karke Publish karo.

## Step 2 — Local server se run karo
ES modules ke kaaran file ko double-click karke kholna theek nahi. VS Code mein folder kholo aur Live Server extension se `index.html` run karo. Internet connection chahiye kyunki Firebase SDK CDN se load hoti hai.

## Step 3 — Admin role ko secure tareeke se grant karo
1. App mein apna student account sign up karo.
2. Firebase Console > Firestore Database > `users` collection mein apne account ka document kholo. Document ID tumhari Firebase Authentication UID honi chahiye.
3. Sirf is document mein `role` field ko `admin` set karo. Role field ka type string ho.
4. Sign out karke dobara sign in karo. Ab Admin Panel dikhna chahiye.

IMPORTANT: Signup form se admin role select karne ka option nahi hai. Kisi unknown user ko admin mat banao. Production system mein admin provisioning ko aur harden karna chahiye.

## Step 4 — Sample content add karo
Admin Panel se notice aur event add karo. Dashboard ab Firestore ke data ko show karega. Purane prototype ke localStorage sample data ko Firebase mein automatically migrate nahi kiya jaata.

## Step 5 — Test checklist
- Student signup/sign-in/sign-out
- Notice search, category filter, save/unsave
- Student Lost & Found report submit kare
- Student admin page nahi khol sake
- Admin notice/event create, edit, delete kare
- Event schedule mein future events dikhein
- Doosre signed-in browser/account se shared notices/events check karein
- Responsive layout aur dark mode test karein

## Important limitations / demo safety
- Calendar abhi date-sorted schedule list hai, month-grid calendar nahi.
- Email verification, password reset, push notifications, image upload aur deployment is starter mein included nahi hain.
- Demo events ki dates example dates hain; admin panel se apne event ke hisaab se edit karo.
- Firestore security rules publish karna zaroori hai. Firebase config alone security rules ka replacement nahi.
- Public hackathon demo mein real student personal data mat daalo.
- Internet/Firebase unavailable ho to cloud features kaam nahi karenge; event venue par network check kar lena.


## Latest UI updates
- FGIET college name added to the sign-up page and footer.
- New student sign-up asks for department and current year and saves them in the student's Firestore profile.
- Events & deadlines page now includes a month-view calendar, highlights today's date, and marks dates that have events/deadlines. Use the arrows to change month.
- Updated the main colour theme to teal/blue.
- Firebase web configuration is set for the Smart Campus project already created by the user.

If you already have an older project folder, replace it with the contents of this updated ZIP. Keep the Firebase project and Firestore rules already configured in Firebase Console.

## Demo data aur Campus Resources
- Dashboard, Notice Board, Calendar aur Lost & Found mein sample entries dikhengi, taaki demo khaali na lage.
- Sample entries par `SAMPLE DATA` / `SAMPLE` label hai. Ye official FGIET notices, actual event dates, ya real lost-property reports nahi hain.
- `Campus resources` section mein study/library, clubs, student support, lost & found, calendar aur saved notices ke quick links hain.
- Admin panel sirf actual Firestore notices/events ko manage karta hai; demo entries edit/delete list mein nahi aati.
- Real campus announcements add karne se pehle official dates, venue aur details verify karna.

## Real data mode (updated)
- The app no longer inserts fake sample notices, events, or Lost & Found reports. Empty sections stay empty until real data is added.
- All notices, events and Lost & Found reports shown after login are read from Cloud Firestore. Student Lost & Found submissions are stored in Firestore and shared with signed-in users.
- Admins can label notices as either `Official FGIET website` or `Admin verified update`. This is a source label only; the publisher must verify the content before posting it.
- Official college website link: https://fgiet.ac.in/ . The website is linked from Campus Resources, but this app does not automatically scrape/import notices from the college site. An admin must verify and publish them, unless a supported official feed/API is provided later.
- Sign-up departments are set to the four requested departments: CSE, Aeronautical Engineering, ECE and Mechanical Engineering. Existing accounts keep their old profile values until updated separately.
- Faculty/admin users must each be provisioned by a trusted project owner: sign in once, then set only that user's `users/{UID}.role` field to `admin` in Firestore. Never add a public admin selector to sign-up.

## Deploy online with Firebase Hosting
Prerequisites: Node.js installed on your computer and access to the Firebase project owner account.
1. Open a terminal in this project folder.
2. Run `npm install -g firebase-tools`
3. Run `firebase login` and sign in to the Google account that owns the `smart-campus-8b6f7` Firebase project.
4. Run `firebase deploy --only hosting`
5. Firebase CLI will show the public Hosting URL when deployment succeeds. Share that URL with students only after testing sign-in, Firestore rules, and admin permissions.

The included `.firebaserc` targets the existing Firebase project `smart-campus-8b6f7`. If you use a different Firebase project, update `.firebaserc` and `firebase-config.js` first. Do not put service-account private keys in this folder.


## Student aur Admin permissions (updated)
- Login page par Student Portal aur Admin Portal ke alag options hain.
- Signup sirf Student Portal se hota hai; signup se admin role nahi milta.
- Students notices/events dekh sakte hain aur Lost & Found report submit kar sakte hain; apni report ko resolved mark kar sakte hain.
- Notices/events create, edit aur delete karna sirf Firestore mein role `admin` wale authorized account ke liye hai.
- Firebase Console mein Rules tab par `firestore.rules` ka content publish karein, phir project folder se `firebase deploy --only hosting,firestore:rules` chalayein.
- Kisi account ko admin banane ke liye Firebase Console > Firestore Database > `users` > us account ke UID document mein `role: "admin"` set karein. Account pehle signup ho chuka hona chahiye.
- `role` field ko client-side se change nahi kiya ja sakta; rules is change ko block karte hain.
