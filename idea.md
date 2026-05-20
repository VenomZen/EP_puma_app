# SSB Fetch

## Idea

A localhost app to practise emergency prosedures for a fixedwind drone system. The drone is Puma AE 2 DDL - Fing pictures of it online. The app should be focused on the learning of autonomous drills with focus on typing everything correct. It should be quiz-based. It is essential that questions and answers is formulated excactly as it is tyoed in this document - down to commas and capital letters. Name it PUMA AE II EP

## Specs

* Point based startup dashboard.
* 12 pages with one question per page.
* Level based system from level 1 to 40 where you can unlock skins on the Puma system.
    * Firs skin normal puma - unlocked at level 2
    * Second skin gold puma - unlocked at level 3.
    * Third skin platinum puma - unlocked at level 4.
    * Fourth skin red tiger stripes - unlocked at level 5.

## Tech

The app should use localhost to host the app. It should be possible to play with 4 players.

## Questions

1. Loss of Link:
2. GPS Failure:
3. Structural or Flight Control Failure:
4. Altitude Hold Failure:
5. Extreme Low Air Vehicle Battery:
6. Propulsion Failed Warning:
7. SEE DIAG Warning Message Received:
8. Over Speed:
9. Avionics Over Temperature:
10. Motor Controller or Li-Ion Aircraft Battery Over Temp:
11. Mid-Air Avoidance:
12. FalconView Interrupted:

## Answers

1. 
- Check orientation of RF unit and reconnect Patch antenna, if required.
2.
- Select ALT Mode.
- Set CMD alt to a safe altitude.
- Turn aircraft toward GCS.
3.
- Return to base, if able.
- If unable, command Autoland.
4.
- Switch to MAN mode and control altitude with % of power.
5.
- Switch to MAN mode and control altitude with % of power.
- Recover aircraft at Home location if able, or select suitable landing area.
6.
- Command Autoland.
- Hot Key to MAN mode and control altitude with % of power.
- If control is regained, continue mission.
- If control is not regained, command Autoland.
7.
- Push Menu Select right three times to enter Diagnostics screen 6.
8.
- Switch to MAN mode and control altitude with % of power.
- If control is regained, continue mission.
- If control is not regained, command Autoland.
9.
- Return to base, if able.
- If unable, command Autoland.
10.
- Reduce % of power as appropriate.
- Clear warning message.
- If message does not clear, Return to base, if able.
- If unable, command Autoland.
11.
- Estimate intruding aircraft altitude.
- Climb/Decend as applicable to avoid aircraft.
12.
- Select ALT Mode.
- Set CMD alt to a safe altitude.
- Turn aircraft toward GCS.

## Progress

Any progress, inputs, design choices and such should be documented in the `progress.md` file.

## README

* Description of the system.
* Reasoning of choice of learning environment.
* Explanation of how the system is used.
* One example of how the user can learn the objectives.
* Description of how a developer can download and run the system
* .gitignore file.
