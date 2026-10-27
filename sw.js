
const CACHE_PREFIX = "firebase-site-";
const META_CACHE = "firebase-site-meta-v1";
const ACTIVE_KEY = new URL("__sw_active_manifest__", self.registration.scope).href;
const PENDING_KEY = new URL("__sw_pending_manifest__", self.registration.scope).href;
const MANIFEST_URL = new URL("js/sw-version.json", self.registration.scope).href;

const UPDATE_TIMEOUT_MS = 10000;

let updatePromise = null;

// Resolve and validate local asset paths.
function resolveAsset(path) {
    const url = new URL(path, self.registration.scope);

    if (
        url.origin !== self.location.origin ||
        !url.href.startsWith(self.registration.scope) ||
        url.href === MANIFEST_URL
    ) {
        throw new Error("Invalid asset path: " + path);
    }

    return url.href;
}

function validateManifest(data) {
    if (
        !data ||
        typeof data.cache_name !== "string" ||
        !data.cache_name.startsWith(CACHE_PREFIX) ||
        !/^[a-zA-Z0-9_-]+$/.test(data.cache_name) ||
        !Array.isArray(data.static_files) ||
        data.static_files.length === 0 ||
        !data.static_files.every(
            (file) => typeof file === "string" && file.length > 0
        )
    ) {
        throw new Error("Invalid Service Worker manifest");
    }

    const files = data.static_files.map(resolveAsset);

    if (new Set(files).size !== files.length) {
        throw new Error("Duplicate files in manifest");
    }

    return {
        cache_name: data.cache_name,
        static_files: files
    };
}

// Fetch with a timeout so network failures don't block indefinitely.
async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(
        () => controller.abort(),
        UPDATE_TIMEOUT_MS
    );

    try {
        return await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            credentials: "same-origin"
        });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchManifest() {
    const response = await fetchWithTimeout(MANIFEST_URL);

    if (!response.ok) {
        throw new Error("Manifest request failed: " + response.status);
    }

    return validateManifest(await response.json());
}

// Store metadata separately from the static asset cache.
async function readManifest(key) {
    const meta = await caches.open(META_CACHE);
    const response = await meta.match(key);

    if (!response) return null;

    try {
        return validateManifest(await response.json());
    } catch {
        return null;
    }
}

async function saveManifest(key, manifest) {
    const meta = await caches.open(META_CACHE);

    await meta.put(
        key,
        new Response(JSON.stringify(manifest), {
            headers: { "Content-Type": "application/json" }
        })
    );
}

async function deleteManifest(key) {
    const meta = await caches.open(META_CACHE);
    await meta.delete(key);
}

function sameVersion(a, b) {
    return !!a &&
        a.cache_name === b.cache_name &&
        a.static_files.length === b.static_files.length &&
        a.static_files.every((file, i) => file === b.static_files[i]);
}

async function verifyCache(cacheName, files) {
    const cache = await caches.open(cacheName);

    for (const file of files) {
        if (!(await cache.match(file))) {
            throw new Error("Required cached file missing: " + file);
        }
    }
}

// Download every file into a separate staging cache.
async function downloadAssets(manifest, stageName) {
    const cache = await caches.open(stageName);

    for (const file of manifest.static_files) {
        const response = await fetchWithTimeout(file);

        if (!response.ok || response.type === "opaque") {
            throw new Error(
                "Could not download " + file + ": " + response.status
            );
        }

        await cache.put(file, response);
    }

    await verifyCache(stageName, manifest.static_files);
}

// Copy verified files to the versioned cache.
// The active cache is never deleted or overwritten here.
async function commitStagedCache(manifest, stageName) {
    const active = await readManifest(ACTIVE_KEY);

    if (active && active.cache_name === manifest.cache_name) {
        if (!sameVersion(active, manifest)) {
            throw new Error(
                "Change cache_name whenever the asset manifest changes"
            );
        }

        await verifyCache(active.cache_name, active.static_files);
        return;
    }

    const destination = await caches.open(manifest.cache_name);
    const stage = await caches.open(stageName);

    // A cache name must identify exactly one version.
    // Do not reuse a name for changed assets.
    if (await caches.has(manifest.cache_name)) {
        await caches.delete(manifest.cache_name);
    }

    const target = await caches.open(manifest.cache_name);

    try {
        for (const file of manifest.static_files) {
            const response = await stage.match(file);

            if (!response) {
                throw new Error("Staged file missing: " + file);
            }

            await target.put(file, response);
        }

        await verifyCache(manifest.cache_name, manifest.static_files);
    } catch (error) {
        await caches.delete(manifest.cache_name);
        throw error;
    }
}

// Remove only this app's old versioned caches.
// Metadata and unrelated caches are preserved.
async function cleanupCaches(keepNames) {
    const names = await caches.keys();

    await Promise.all(
        names
            .filter(
                (name) =>
                    name.startsWith(CACHE_PREFIX) &&
                    !keepNames.has(name)
            )
            .map((name) => caches.delete(name))
    );
}

// Initial installation or installation of an updated worker.
async function prepareVersion(manifest) {
    const active = await readManifest(ACTIVE_KEY);

    if (sameVersion(active, manifest)) {
        await verifyCache(active.cache_name, active.static_files);
        return;
    }

    if (
        active &&
        active.cache_name === manifest.cache_name
    ) {
        throw new Error(
            "Manifest changed without changing cache_name"
        );
    }

    const stageName =
        CACHE_PREFIX + "staging-" + crypto.randomUUID();

    try {
        await downloadAssets(manifest, stageName);
        await commitStagedCache(manifest, stageName);
    } finally {
        await caches.delete(stageName);
    }
}

// Background update. Existing pages keep using the current cache
// until every file in the new version has been verified.
async function updateInBackground() {
    if (updatePromise) return updatePromise;

    updatePromise = (async () => {
        const latest = await fetchManifest();
        const active = await readManifest(ACTIVE_KEY);

        if (sameVersion(active, latest)) return;

        if (
            active &&
            active.cache_name === latest.cache_name
        ) {
            throw new Error(
                "Use a new cache_name for every changed version"
            );
        }

        const stageName =
            CACHE_PREFIX + "staging-" + crypto.randomUUID();

        try {
            await downloadAssets(latest, stageName);
            await commitStagedCache(latest, stageName);

            // Switch the active pointer only after the new cache is complete.
            await saveManifest(ACTIVE_KEY, latest);

            // Keep only the newly active cache after a successful switch.
            await cleanupCaches(
                new Set([META_CACHE, latest.cache_name])
            );

            console.info("[SW] Activated cache:", latest.cache_name);
        } finally {
            await caches.delete(stageName);
        }
    })()
        .catch((error) => {
            console.warn(
                "[SW] Update failed; retaining the previous version:",
                error
            );
        })
        .finally(() => {
            updatePromise = null;
        });

    return updatePromise;
}

// Install the initial complete cache before activating the worker.
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const manifest = await fetchManifest();

            await prepareVersion(manifest);
            await saveManifest(PENDING_KEY, manifest);

            await self.skipWaiting();
        })()
    );
});

// Activate using the exact manifest prepared during installation.
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const pending = await readManifest(PENDING_KEY);

            if (!pending) {
                throw new Error("No prepared manifest found");
            }

            await verifyCache(
                pending.cache_name,
                pending.static_files
            );

            await saveManifest(ACTIVE_KEY, pending);
            await deleteManifest(PENDING_KEY);

            await cleanupCaches(
                new Set([META_CACHE, pending.cache_name])
            );

            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;

    // Always request the version manifest from the network.
    if (url.href === MANIFEST_URL) {
        event.respondWith(fetch(request));
        return;
    }

    // Start update checks on page navigations, without delaying
    // the response served from the currently active cache.
    if (request.mode === "navigate") {
        event.waitUntil(updateInBackground());
    }

    event.respondWith(
        (async () => {
            const active = await readManifest(ACTIVE_KEY);

            if (active) {
                const asset = active.static_files.find(
                    (file) => file === url.href
                );

                if (asset) {
                    const cache = await caches.open(active.cache_name);
                    const cached = await cache.match(asset);

                    if (cached) return cached;
                }
            }

            // Unlisted files are not added to the cache.
            try {
                return await fetch(request);
            } catch {
                return new Response(
                    "This resource is unavailable offline.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8"
                        }
                    }
                );
            }
        })()
    );
});