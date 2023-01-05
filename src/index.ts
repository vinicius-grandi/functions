import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getApps} from "firebase-admin/app";
import {resolve} from "path";
import {config} from "dotenv";
import type {TransactionResult} from "@firebase/database-types";

if (process.env.NODE_ENV !== "production") {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
}

type Coffin = {
  selected: boolean;
  player: string | number;
};

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

const app =
  getApps().length === 0 ? admin.initializeApp(configAdmin) : getApps()[0];

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
      if (nextPhase === "votingTime") {
        return null;
      }
      const db = admin.database(app);
      return Promise.all([updateDevil(), updateCoffins(), updateTargets()]);

      /** @return {string} */
      function currentSessionRef(): string {
        return `sessions/${context.params.session}`;
      }
      /** @return {Promise<void>} */
      function updateDevil(): Promise<TransactionResult> {
        return db.ref(`${currentSessionRef()}`).transaction((session) => {
          return {
            ...session,
            devil: session.nextDevil,
            lastDevil: session.devil,
            nextDevil: null,
          };
        });
      }

      /**  @return {Promise<TransactionResult>} */
      function updateTargets(): Promise<TransactionResult> {
        return db.ref(
            `${currentSessionRef()}/targets`).transaction((targets) => {
          if (targets < 12) {
            return targets + 1;
          }
        });
      }

      /** @return { Promise<void>[] } */
      async function updateCoffins(): Promise<Promise<void>[]> {
        const selectedPlayers: string[] = [];
        const unselectedCoffins: number[] = [];

        (await coffins()).forEach(({selected, player}, idx) => {
          if (selected && typeof player === "string") {
            selectedPlayers.push(player);
          } else {
            unselectedCoffins.push(idx);
          }
        });
        await selectAvailableTarget();
        return decreaseExistencePoints();
        /** @return {Promise<Coffin[]>} */
        async function coffins(): Promise<Coffin[]> {
          return (await db.ref(coffinsRef()).get()).val();
        }
        /** @return {Promise<void>} */
        async function selectAvailableTarget(): Promise<void> {
          if (unselectedCoffins.length > 0) {
            const lastDevil = (
              await db.ref(`${currentSessionRef()}/lastDevil`).get()
            ).val();
            await db.ref(`${coffinsRef()}/${unselectedCoffins[0]}`).update({
              selected: true,
              player: lastDevil,
            });
          }
        }

        /** @return {string} */
        function coffinsRef(): string {
          return `${currentSessionRef()}/coffins`;
        }
        /** @return {Promise<void>[]} */
        function decreaseExistencePoints(): Promise<void>[] {
          return selectedPlayers.map(async (player) => {
            await db
                .ref(`${currentSessionRef()}/players/${player}/existencePoints`)
                .set(admin.database.ServerValue.increment(-1));
          });
        }
      }
    });
