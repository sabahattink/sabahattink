import { describe, expect, it } from "vitest";
import { isCommandTitle, parseCommand } from "./command.js";

describe("parseCommand", () => {
  it("accepts the three command forms, case-insensitively", () => {
    expect(parseCommand("bms: office setpoint 23.5")).toEqual({ ok: true, command: { kind: "setpoint", zone: "office", value: 23.5 } });
    expect(parseCommand("BMS: Server Lights ON")).toEqual({ ok: true, command: { kind: "lights", zone: "server", on: true } });
    expect(parseCommand("  bms:   ack ")).toEqual({ ok: true, command: { kind: "ack" } });
  });

  it("names unknown zones with the BACnet error UNKNOWN_OBJECT", () => {
    expect(parseCommand("bms: kitchen setpoint 22")).toMatchObject({ ok: false, error: "UNKNOWN_OBJECT" });
  });

  it("rejects anything outside the grammar", () => {
    for (const title of [
      "bms:",
      "bms: office",
      "bms: office setpoint",
      "bms: office setpoint 22.25",
      "bms: office setpoint -5",
      "bms: office setpoint 1e3",
      "bms: office lights dim",
      "bms: office setpoint 22 now",
      "bms: ack please",
      "bms: office setpoint $(rm -rf /)",
    ]) {
      expect(parseCommand(title)).toMatchObject({ ok: false, error: expect.stringMatching(/UNRECOGNIZED_SERVICE|UNKNOWN_OBJECT/) });
    }
  });

  it("only treats titles with the prefix as commands", () => {
    expect(isCommandTitle("bms: ack")).toBe(true);
    expect(isCommandTitle("Bug: README typo")).toBe(false);
  });
});
