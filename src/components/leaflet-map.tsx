import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Colors } from '@/constants/theme';
import { API_URL } from '@/lib/config';
import { useT } from '@/lib/i18n/language';

/** Dot colours — the website's `COUNTER_COLORS` / `REP_LIVE_COLOR`. */
export const MAP_COLORS = {
  visited: '#1E9E5A',
  pending: '#8A8F98',
  counter: '#E0A100',
  me: '#2E5FA3',
} as const;

export type MapCounter = {
  id: string;
  name: string;
  type: string;
  area: string;
  lat: number;
  lng: number;
  visited: boolean;
  assigned: boolean;
};

export type MapMe = { lat: number; lng: number; accuracyM: number | null; stale: boolean } | null;

type Props = {
  tiles: { url: string; attribution: string };
  counters: MapCounter[];
  me: MapMe;
  /** Point the map at a counter; `at` lets the same counter be focused twice. */
  focus: { id: string; at: number } | null;
  /** Centre on "you" — a new timestamp each time it's asked for. */
  locateAt?: number | null;
  onCheckIn: (counterId: string) => void;
};

/**
 * Leaflet in a WebView — the same library and tile server as the website's
 * live map, so no Google Maps key is needed and both maps look alike.
 * Data goes in through `window.__update`; taps come back as messages.
 */
export function LeafletMap({ tiles, counters, me, focus, locateAt, onCheckIn }: Props) {
  const t = useT();
  const ref = useRef<WebView>(null);
  const loaded = useRef(false);
  /** The payload the page has, so an unchanged one isn't redrawn (which would
   * also close an open popup). */
  const sentJson = useRef<string | null>(null);
  const latestJson = JSON.stringify({ counters, me });
  // Built once per tile setting: a new `source` object would reload the page.
  const labels: Labels = {
    checkIn: t('Check in'),
    openCounter: t('Open counter'),
    visited: t('Visited'),
    pending: t('Pending'),
    counter: t('Counter'),
    you: t('You'),
  };
  const labelsJson = JSON.stringify(labels);
  const source = useMemo(
    () => ({
      html: buildHtml({ url: tiles.url, attribution: tiles.attribution }, JSON.parse(labelsJson) as Labels),
      baseUrl: API_URL,
    }),
    [tiles.url, tiles.attribution, labelsJson],
  );

  useEffect(() => {
    if (!loaded.current || sentJson.current === latestJson) return;
    sentJson.current = latestJson;
    ref.current?.injectJavaScript(`window.__update(${latestJson}); true;`);
  }, [latestJson]);

  useEffect(() => {
    if (focus && loaded.current) ref.current?.injectJavaScript(`window.__focus(${JSON.stringify(focus.id)}); true;`);
  }, [focus]);

  useEffect(() => {
    if (locateAt && loaded.current) ref.current?.injectJavaScript('window.__locate(); true;');
  }, [locateAt]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; id?: string };
      if (msg.type === 'checkin' && msg.id) onCheckIn(msg.id);
    } catch {
      // Not ours.
    }
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        // Tile servers ask apps to identify themselves; serving from the
        // portal's address gives tile requests a meaningful Referer.
        source={source}
        onLoadEnd={() => {
          loaded.current = true;
          sentJson.current = latestJson;
          ref.current?.injectJavaScript(`window.__update(${latestJson}); true;`);
        }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </View>
  );
}

type Labels = { checkIn: string; openCounter: string; visited: string; pending: string; counter: string; you: string };

function buildHtml(tiles: Props['tiles'], labels: Labels): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; background: ${Colors.lineSoft}; }
  .leaflet-popup-content { margin: 10px 12px; font: 13px/1.35 -apple-system, Roboto, sans-serif; }
  .p-name { font-weight: 700; color: ${Colors.ink1}; }
  .p-meta { color: ${Colors.ink3}; margin-top: 2px; }
  .p-btn { margin-top: 8px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px;
           background: ${Colors.brand}; color: #fff; font-weight: 700; font-size: 13px; }
</style>
</head><body><div id="map"></div>
<script>
  var COLORS = ${JSON.stringify(MAP_COLORS)};
  var T = ${JSON.stringify(labels)};
  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([22.5, 79], 5);
  L.tileLayer(${JSON.stringify(tiles.url)}, { attribution: ${JSON.stringify(tiles.attribution)}, maxZoom: 19 }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var markers = {};
  var meMarker = null, meRing = null, fitted = false;

  function post(msg) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

  function popup(c) {
    var box = document.createElement('div');
    var name = document.createElement('div'); name.className = 'p-name'; name.textContent = c.name;
    var meta = document.createElement('div'); meta.className = 'p-meta';
    meta.textContent = c.type + ' · ' + c.area + ' · ' + (c.visited ? T.visited : c.assigned ? T.pending : T.counter);
    var btn = document.createElement('button'); btn.className = 'p-btn';
    btn.textContent = c.visited ? T.openCounter : T.checkIn;
    btn.onclick = function () { post({ type: 'checkin', id: c.id }); };
    box.appendChild(name); box.appendChild(meta); box.appendChild(btn);
    return box;
  }

  window.__update = function (data) {
    layer.clearLayers(); markers = {};
    var bounds = [];
    data.counters.forEach(function (c) {
      var color = c.visited ? COLORS.visited : c.assigned ? COLORS.pending : COLORS.counter;
      var m = L.circleMarker([c.lat, c.lng], { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 })
        .bindPopup(popup(c)).addTo(layer);
      markers[c.id] = m; bounds.push([c.lat, c.lng]);
    });
    if (meMarker) { map.removeLayer(meMarker); meMarker = null; }
    if (meRing) { map.removeLayer(meRing); meRing = null; }
    if (data.me) {
      var color = data.me.stale ? COLORS.pending : COLORS.me;
      if (data.me.accuracyM) {
        meRing = L.circle([data.me.lat, data.me.lng], { radius: data.me.accuracyM, color: color, weight: 1, fillOpacity: 0.08 }).addTo(map);
      }
      meMarker = L.circleMarker([data.me.lat, data.me.lng], { radius: 9, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 })
        .bindPopup(T.you).addTo(map);
      bounds.push([data.me.lat, data.me.lng]);
    }
    if (!fitted && bounds.length) {
      fitted = true;
      if (bounds.length === 1) map.setView(bounds[0], 15);
      else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    }
  };

  window.__locate = function () {
    if (!meMarker) return;
    map.setView(meMarker.getLatLng(), Math.max(map.getZoom(), 16));
  };

  window.__focus = function (id) {
    var m = markers[id];
    if (!m) return;
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 16));
    m.openPopup();
  };
</script></body></html>`;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.lineSoft,
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
