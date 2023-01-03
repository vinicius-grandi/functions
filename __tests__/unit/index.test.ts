process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";

import * as functions from "../../src";
import * as firebaseFunctionTest from "firebase-functions-test";

const test = firebaseFunctionTest({
  projectId: "ct-ordo-realitas",
  databaseURL: "https://ct-ordo-realitas-default-rtdb.firebaseio.com",
  storageBucket: "ct-ordo-realitas.appspot.com",
});

const updateCoffins = test.wrap(functions.updateCoffins);


describe("devil coffins", () => {
  const beforeSnap = test.database.makeDataSnapshot({
    phase: "votingTime",
  }, "/countdowns/first");
  const afterSnap = test.database.makeDataSnapshot({
    phase: "discussionTime",
  }, "countdowns/first");

  const change = test.makeChange(beforeSnap, afterSnap);

  it("updates values when game phase is changed to discussionTime",
      async () => {
        const response = await updateCoffins(change, {
          params: {
            session: "first",
          },
        });
        console.log(response);
      });
});
