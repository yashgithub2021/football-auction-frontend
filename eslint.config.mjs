import {
    defineConfig,
    globalIgnores
} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Domain functions that change game state. Only the server may run them in multiplayer. */
const ENGINE_MUTATORS = [
    "applyAction",
    "createGame",
    "startGame",
    "startAuction",
    "placeBid",
    "finalizeAuction",
    "pauseAuction",
    "resumeAuction",
    "advanceGame",
    "tick",
    "completeGame",
    "endGame",
];

const BACKEND_INTERNALS = {
    group: ["**/backend/src/**", "@/shared/*", "@/shared/**", "**/shared/room/*"],
    message: "Use @protocol (wire contract) or @domain (types, data, display selectors). Never import backend code or src/shared directly.",
};

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        // Every frontend file: the only way into the backend is @protocol / @domain.
        files: ["src/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [BACKEND_INTERNALS]
            }],
        },
    },
    {
        // The multiplayer path renders server snapshots; it never runs the engine
        // or the old single-device store.
        files: [
            "src/app/**/*.{ts,tsx}",
            "src/lib/**/*.{ts,tsx}",
            "src/state/room/**/*.{ts,tsx}",
            "src/components/room/**/*.{ts,tsx}",
            "src/components/auction/**/*.{ts,tsx}",
            "src/components/results/**/*.{ts,tsx}",
        ],
        ignores: ["**/*.test.{ts,tsx}", "src/components/auction/AuctionScreen.tsx"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [{
                            name: "@domain/engine",
                            importNames: ENGINE_MUTATORS,
                            message: "Game state comes from the server. Send an intent through RoomClient instead.",
                        },
                        {
                            name: "@/state/gameStore",
                            message: "Single-device store (test harness only). Use RoomClient."
                        },
                        {
                            name: "@/components/GameApp",
                            message: "Single-device app (test harness only)."
                        },
                        {
                            name: "@results",
                            message: "Results are built on the server. Render snapshot.results (types come from @protocol).",
                        },
                    ],
                    patterns: [
                        BACKEND_INTERNALS,
                        {
                            group: ["@domain/engine/*"],
                            message: "Import display selectors from @domain/engine only."
                        },
                    ],
                },
            ],
        },
    },
    // src/shared is generated from the backend (scripts/sync-shared.mjs) and linted there.
    globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "src/shared/**"]),
]);