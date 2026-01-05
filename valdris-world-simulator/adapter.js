// Adapter shim to expose ValdrisWorld API without duplicating simulation logic.

const BIND_TARGETS = [
    {
        name: 'ValdrisWorldSimulator',
        get: () => window.ValdrisWorldSimulator
    },
    {
        name: 'WorldSimulator',
        get: () => window.WorldSimulator
    },
    {
        name: 'VMasterTracker.simulation',
        get: () => window.VMasterTracker?.simulation
    },
    {
        name: 'VMasterSimulation',
        get: () => window.VMasterSimulation
    }
];

const adapterState = {
    bound: false,
    boundName: null,
    target: null
};

function resolveAdapterTarget() {
    for (const candidate of BIND_TARGETS) {
        try {
            const target = candidate.get();
            if (target && (typeof target.advanceTime === 'function' || typeof target.advance === 'function')) {
                adapterState.bound = true;
                adapterState.boundName = candidate.name;
                adapterState.target = target;
                return true;
            }
        } catch (e) {
            console.warn('[ValdrisWorld] Adapter candidate failed', candidate.name, e);
        }
    }
    adapterState.bound = false;
    adapterState.boundName = null;
    adapterState.target = null;
    return false;
}

function emitAdapterEvent() {
    try {
        window.dispatchEvent(new CustomEvent('valdris-world-adapter-bound', {
            detail: {
                adapterBound: adapterState.bound,
                boundName: adapterState.boundName
            }
        }));
    } catch (e) {
        console.warn('[ValdrisWorld] Adapter event failed', e);
    }
}

function attemptBind(attempt = 0, delays = [200, 750, 2000]) {
    try {
        if (resolveAdapterTarget()) {
            console.log('[ValdrisWorld] Adapter bound to', adapterState.boundName);
            emitAdapterEvent();
            return;
        }

        if (attempt < delays.length) {
            const delay = delays[attempt];
            setTimeout(() => attemptBind(attempt + 1, delays), delay);
        } else {
            console.warn('[ValdrisWorld] Adapter binding failed after retries');
            emitAdapterEvent();
        }
    } catch (e) {
        console.warn('[ValdrisWorld] Adapter bind attempt failed', e);
    }
}

function safeCall(action, fallbackValue = false) {
    try {
        return action();
    } catch (e) {
        console.warn('[ValdrisWorld] Adapter call failed', e);
        return fallbackValue;
    }
}

window.ValdrisWorld = {
    advance(delta = {}) {
        return safeCall(() => {
            if (!adapterState.bound) {
                console.warn('[ValdrisWorld] advance called but adapter not bound');
                return false;
            }
            if (adapterState.target.advanceTime) {
                adapterState.target.advanceTime(delta);
                return true;
            }
            if (adapterState.target.advance) {
                adapterState.target.advance(delta);
                return true;
            }
            console.warn('[ValdrisWorld] advance unavailable on bound target');
            return false;
        }, false);
    },
    advanceDay() {
        return safeCall(() => window.ValdrisWorld.advance({ days: 1 }), false);
    },
    advanceWeek() {
        return safeCall(() => window.ValdrisWorld.advance({ days: 7 }), false);
    },
    setEnabled(enabled) {
        return safeCall(() => {
            if (!adapterState.bound) {
                console.warn('[ValdrisWorld] setEnabled called but adapter not bound');
                return false;
            }
            if (typeof adapterState.target.setEnabled === 'function') {
                adapterState.target.setEnabled(Boolean(enabled));
                return true;
            }
            console.log('[ValdrisWorld] setEnabled noop for target', adapterState.boundName);
            return true;
        }, false);
    },
    smokeTest() {
        return safeCall(() => ({
            panelExists: Boolean(document.getElementById('valdris-world-sim-panel')),
            adapterBound: adapterState.bound,
            boundName: adapterState.boundName,
            instructions: adapterState.bound
                ? 'Adapter bound successfully.'
                : 'Adapter not bound. Ensure ValdrisWorldSimulator is loaded before adapter.js.'
        }), { panelExists: false, adapterBound: false, boundName: null });
    }
};

attemptBind();
