async function sha256Hex(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function hmacSha256Hex(secret, message) {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {
            name: "HMAC",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(message)
    );

    return Array.from(new Uint8Array(signature))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function getCoinflipResultFromDigest(digest) {
    const number = Number.parseInt(digest.slice(0, 8), 16);

    return number % 2 === 0 ? "heads" : "tails";
}

function getRouletteResultFromDigest(digest) {
    const number = Number.parseInt(digest.slice(0, 8), 16);
    const slot = number % 15;

    if (slot === 0) {
        return {
            slot,
            result: "green",
            label: "Green",
        };
    }

    if (slot % 2 === 1) {
        return {
            slot,
            result: "ct",
            label: "CT",
        };
    }

    return {
        slot,
        result: "t",
        label: "T",
    };
}

function getCaseOpeningResultFromDigest(digest, itemsSnapshot) {
    const number = Number.parseInt(digest.slice(0, 8), 16);

    const totalWeight = itemsSnapshot.reduce((total, item) => {
        return total + Number(item.weight || 0);
    }, 0);

    if (!totalWeight) {
        return null;
    }

    const roll = number % totalWeight;

    let current = 0;

    for (const item of itemsSnapshot) {
        current += Number(item.weight || 0);

        if (roll < current) {
            return {
                roll,
                totalWeight,
                item,
            };
        }
    }

    return {
        roll,
        totalWeight,
        item: itemsSnapshot[itemsSnapshot.length - 1],
    };
}

export async function verifyBetResult(bet) {
    const serverSeedHash = await sha256Hex(bet.server_seed);

    const serverSeedHashMatches =
        serverSeedHash === bet.server_seed_hash;

    if (bet.game_type === "coinflip") {
        const message = `${bet.client_seed}:${bet.nonce}`;
        const digest = await hmacSha256Hex(bet.server_seed, message);
        const calculatedResult = getCoinflipResultFromDigest(digest);

        return {
            supported: true,
            gameType: "coinflip",
            serverSeedHash,
            serverSeedHashMatches,
            message,
            digest,
            calculatedResult,
            calculatedSlot: null,
            expectedResult: bet.result,
            resultMatches: calculatedResult === bet.result,
        };
    }

    if (bet.game_type === "roulette") {
        const message = `roulette:${bet.client_seed}:${bet.nonce}`;
        const digest = await hmacSha256Hex(bet.server_seed, message);
        const rouletteResult = getRouletteResultFromDigest(digest);

        return {
            supported: true,
            gameType: "roulette",
            serverSeedHash,
            serverSeedHashMatches,
            message,
            digest,
            calculatedResult: rouletteResult.result,
            calculatedLabel: rouletteResult.label,
            calculatedSlot: rouletteResult.slot,
            expectedResult: bet.result,
            expectedSlot: bet.metadata?.slot,
            resultMatches:
                rouletteResult.result === bet.result &&
                Number(rouletteResult.slot) === Number(bet.metadata?.slot),
        };
    }

    if (bet.game_type === "case_opening") {
        const itemsSnapshot = bet.metadata?.items_snapshot || [];

        if (!itemsSnapshot.length) {
            return {
                supported: false,
                gameType: "case_opening",
                serverSeedHash,
                serverSeedHashMatches,
                message: null,
                digest: null,
                calculatedResult: null,
                calculatedSlot: null,
                expectedResult: bet.result,
                resultMatches: false,
            };
        }

        const message = `case_opening:${bet.client_seed}:${bet.nonce}`;
        const digest = await hmacSha256Hex(bet.server_seed, message);
        const caseResult = getCaseOpeningResultFromDigest(digest, itemsSnapshot);

        const calculatedItemName = caseResult?.item?.name || null;
        const expectedItemName = bet.metadata?.item_name || bet.result;

        return {
            supported: true,
            gameType: "case_opening",
            serverSeedHash,
            serverSeedHashMatches,
            message,
            digest,
            calculatedResult: calculatedItemName,
            calculatedItem: caseResult?.item || null,
            calculatedRoll: caseResult?.roll,
            totalWeight: caseResult?.totalWeight,
            expectedResult: expectedItemName,
            resultMatches: calculatedItemName === expectedItemName,
        };
    }

    return {
        supported: false,
        gameType: bet.game_type,
        serverSeedHash,
        serverSeedHashMatches,
        message: null,
        digest: null,
        calculatedResult: null,
        calculatedSlot: null,
        expectedResult: bet.result,
        resultMatches: false,
    };
}