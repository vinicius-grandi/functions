import * as functions from "../../src";
import * as firebaseFunctionTest from "firebase-functions-test";
import {resolve} from "path";
import {config} from "dotenv";
import {database} from "firebase-admin";
import {expect} from "chai";

config({
  path: resolve(".env"),
});

const test = firebaseFunctionTest();

const updateCoffins = test.wrap(functions.updateCoffins);


describe("devil coffins", () => {
  const sessionRef = "/sessions/first";
  const nextDevil = "c";
  const currentDevil = "b";

  before(() => {
    database()
        .ref(`${sessionRef}`)
        .set({
          players: {
            a: {
              existencePoints: 6,
            },
            b: {
              existencePoints: 6,
            },
            c: {
              existencePoints: 6,
            },
            d: {
              existencePoints: 6,
            },
            e: {
              existencePoints: 6,
            },
          },
          devil: currentDevil,
          nextDevil,
          targets: 6,
          coffins: [
            ...Array.from(Array(6).fill({selected: false})),
            ...Array.from(Array(5).fill({selected: true})),
            {
              selected: true,
              player: "a",
            }]});
  });

  after(async () => {
    test.cleanup();
    await database().ref(sessionRef).remove();
  });

  const beforeSnap = test.database.makeDataSnapshot({
    phase: "votingTime",
  }, "/countdowns/first");
  const afterSnap = test.database.makeDataSnapshot({
    phase: "discussionTime",
  }, "countdowns/first");

  const change = test.makeChange(beforeSnap, afterSnap);

  it("updates game state on phase change",
      async () => {
        await updateCoffins(change, {
          params: {
            session: "first",
          },
        });
        const sessionSnap = await database().ref(sessionRef).get();
        const session = sessionSnap.val();

        // players inside selected coffins will lose existence points
        expect(session.players.a.existencePoints).to.be.eq(5);

        // value from "nextDevil" is assigned to "devil"
        // and the current one becomes the "lastDevil"
        expect(session.devil).to.be.eq(nextDevil);
        expect(session.lastDevil).to.be.eq(currentDevil);

        // increase target number
        expect(session.targets).to.be.eq(7);
        expect(
            session.coffins.filter(
                ({selected}: { selected: boolean }) => selected).length
        ).to.be.equal(7);
        expect(
            session.coffins.some(
                ({player}: { player: string }) => player === session.lastDevil)
        ).to.be.true;
      });
});
