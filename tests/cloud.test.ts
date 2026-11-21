import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

import { configuredEnv } from "../src/lib/env.ts"
import { entriesFromRows, entryToRow } from "../src/lib/rating-rows.ts"
import type { Entry } from "../src/lib/entries.ts"
import { localImportChoice, rememberLocalImport } from "../src/lib/storage.ts"

const sample: Entry = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "podcast",
  title: "  Talk  ",
  url: "https://example.com/watch",
  date: "2026-11-20T12:00:00.000Z",
  scores: {
    fulfilled: 5,
    feelAfter: 1,
    watchAgain: 5,
    learned: 5,
    worthTime: 5,
    attention: 5,
    actOn: 5,
  },
  total: 99,
}

describe("schema", () => {
  it("locks ratings to the signed-in user", () => {
    const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8")
    assert.match(sql, /create table if not exists public\.ratings/i)
    assert.match(sql, /id uuid primary key/)
    assert.match(sql, /user_id uuid not null references auth\.users/)
    assert.match(sql, /title text/)
    assert.match(sql, /url text/)
    assert.match(sql, /scores jsonb not null/)
    assert.match(sql, /total integer not null/)
    assert.match(sql, /created_at timestamptz/)
    assert.match(sql, /enable row level security/i)
    assert.match(sql, /auth\.uid\(\) = user_id/)
    assert.match(sql, /for select/)
    assert.match(sql, /for insert/)
    assert.match(sql, /for delete/)
  })
})

describe("configuredEnv", () => {
  it("requires both a url and a key", () => {
    assert.equal(configuredEnv(undefined, undefined), null)
    assert.equal(configuredEnv("  ", "key"), null)
    assert.equal(configuredEnv("https://example.supabase.co", "  "), null)
    assert.deepEqual(configuredEnv(" https://example.supabase.co ", " anon-key "), {
      url: "https://example.supabase.co",
      key: "anon-key",
    })
  })

  it("rejects a url that is not http(s)", () => {
    assert.equal(configuredEnv("postgres://db.example", "key"), null)
    assert.equal(configuredEnv("not a url", "key"), null)
  })
})

describe("rating rows", () => {
  it("maps a row back through scoring, including the cap", () => {
    const row = entryToRow({ ...sample, title: "Talk", total: 60 }, "user-1")
    const parsed = entriesFromRows([
      {
        id: row.id,
        title: `  ${row.title}  `,
        url: row.url,
        scores: row.scores,
        total: 99,
        created_at: row.created_at,
      },
      {
        id: "bad",
        title: "Nope",
        url: "",
        scores: { fulfilled: 9 },
        total: 1,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ])
    assert.equal(parsed.skipped, 1)
    assert.equal(parsed.entries.length, 1)
    assert.equal(parsed.entries[0]?.title, "Talk")
    assert.equal(parsed.entries[0]?.total, 60)
    assert.equal(parsed.entries[0]?.date, "2026-11-20T12:00:00.000Z")
    assert.equal(parsed.entries[0]?.kind, "podcast")
    assert.equal("kind" in (parsed.entries[0]?.scores ?? {}), false)
    assert.equal(row.user_id, "user-1")
  })
})

describe("rows saved before types existed", () => {
  it("load as Video", () => {
    const parsed = entriesFromRows([
      {
        id: "legacy",
        title: "Old clip",
        url: "",
        scores: sample.scores,
        total: 60,
        created_at: "2026-11-19T12:00:00.000Z",
      },
    ])
    assert.equal(parsed.entries.length, 1)
    assert.equal(parsed.entries[0]?.kind, "video")
  })
})

describe("local import choice", () => {
  it("remembers a one-time choice per account", () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
      },
    })

    assert.equal(localImportChoice("user-a"), null)
    rememberLocalImport("user-a", "dismissed")
    rememberLocalImport("user-b", "imported")
    assert.equal(localImportChoice("user-a"), "dismissed")
    assert.equal(localImportChoice("user-b"), "imported")
  })
})
