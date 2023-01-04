import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getApps} from "firebase-admin/app";
import {resolve} from "path";
import {config} from "dotenv";
import type {TransactionResult} from "@firebase/database-types";

config({
  path: resolve(".env"),
});


const configAdmin = {
  credential: admin.credential.cert({
    projectId: process.env.PROJECT_ID ?? ".",
    privateKey: (
      process.env.PRIVATE_KEY ??
      "-----BEGIN PRIVATE KEY-----\n<STRING>\n-----END PRIVATE KEY-----"
    ).replace(/\\n/g, "\n"),
    clientEmail: process.env.CLIENT_EMAIL ?? ".",
  }),
  databaseURL: process.env.DATABASE_URL ?? ".",
};

const app = getApps().length === 0 ?
admin.initializeApp(configAdmin) :
getApps()[0];


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
      const db = admin.database(app);
      const currentSessionRef = `sessions/${context.params.session}`;
      if (nextPhase === "discussionTime") {
        return Promise.all(
            [updateDevil(), updateCoffins(), updateTargets()]
        );
      }
      return null;
      /**
       * @return {Promise<void>}
       */
      function updateDevil(): Promise<TransactionResult> {
        return db.ref(`${currentSessionRef}`).transaction((session) => {
          return {
            ...session,
            devil: session.nextDevil,
            lastDevil: session.devil,
            nextDevil: null,
          };
        });
      }

      /**
       * @return {Promise<void>}
       */
      function updateTargets(): Promise<void> {
        return db
            .ref(`${currentSessionRef}/targets`)
            .set(admin.database.ServerValue.increment(1));
      }

      /**
       * @return { Promise<void>[] }
       */
      async function updateCoffins(): Promise<Promise<void>[]> {
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

        return selectedPlayers.map(async (player) => {
          await db
              .ref(`${currentSessionRef}/players/${player}/existencePoints`)
              .set(admin.database.ServerValue.increment(-1));
        }
        );
      }
    });
