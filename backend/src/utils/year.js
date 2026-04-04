function normalizeYearInput(year) {
    return String(year || '').trim();
}

function buildYearCandidates(year) {
    const normalized = normalizeYearInput(year);
    const candidates = new Set();

    if (!normalized) {
        return [];
    }

    candidates.add(normalized);

    if (/^\d{4}-\d{2}$/.test(normalized)) {
        candidates.add(normalized.slice(0, 4));
    }

    if (/^\d{4}$/.test(normalized)) {
        const endYearShort = String((parseInt(normalized, 10) + 4) % 100).padStart(2, '0');
        candidates.add(`${normalized}-${endYearShort}`);
    }

    return [...candidates];
}

function isYearTypeError(errorMessage) {
    const message = String(errorMessage || '').toLowerCase();
    return message.includes('invalid input syntax') ||
        message.includes('operator does not exist') ||
        message.includes('type mismatch');
}

module.exports = {
    normalizeYearInput,
    buildYearCandidates,
    isYearTypeError
};