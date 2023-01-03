import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const surpriseAnfitras = functions.database
    .ref("/rooms/{room}")
    .onCreate((snap) => {
      if (Math.random() < 0.0413) {
        return snap.ref.update({
          isAnfitriaoHere: true,
        });
      }
      return null;
    });

export const updateCoffins = functions.database
    .ref("/countdowns/{session}")
    .onUpdate(async (snap, context) => {
      const nextPhase: "discussionTime" | "votingTime" = snap.after.val().phase;
      if (nextPhase === "discussionTime") {
        const db = admin.database();
        const currentSessionRef = `sessions/${context.params.session}`;
        const coffins: {
        selected: boolean;
        player: string | number;
      }[] = (await db.ref(`${currentSessionRef}/coffins`).get()).val();
        const selectedPlayers: string[] = [];
        const unselectedCoffins: number[] = [];

        coffins.forEach(({selected, player}, idx) => {
          if (selected && typeof player === "string") {
            selectedPlayers.push(player);
          }
          if (selected === false) {
            unselectedCoffins.push(idx);
          }
        });

        return Promise.all(
            selectedPlayers.map(async (player) =>
              await db
                  .ref(`${currentSessionRef}/players/${player}/existencePoints`)
                  .set(admin.database.ServerValue.increment(-1))
            )
        );
      }
      return null;
    });
