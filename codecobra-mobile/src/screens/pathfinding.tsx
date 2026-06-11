import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Image as SvgImage, Polyline, Circle } from 'react-native-svg';
import FloorPlanImage from '../imports/PlattegrondGieterijBeganegrondV2.0.png';
import { findPathOnMap } from '../services/pathfinding';
import { useAppContext } from '../context/AppContext';

export default function PathfindingScreen() {
  const { width, height } = useWindowDimensions();
  const MAP_W = Math.min(width - 32, height - 120); // keep a square-ish area
  const MAP_H = MAP_W * (704 / 1531);

  const scaleX = (x: number) => (x / 1531) * MAP_W;
  const scaleY = (y: number) => (y / 704) * MAP_H;

  const containerRef = useRef<any>(null);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [status, setStatus] = useState('Tap to set start point');

  const { stops } = useAppContext();

  const onMapPress = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    // convert to original map coords (1531x704)
    const mapX = (locationX / MAP_W) * 1531;
    const mapY = (locationY / MAP_H) * 704;

    if (!start) {
      setStart([mapX, mapY]);
      setStatus('Tap to set end point');
      return;
    }
    if (!end) {
      const endPt: [number, number] = [mapX, mapY];
      setEnd(endPt);
      setStatus('Calculating route...');
      const p = findPathOnMap(start, endPt, { padding: 12 });
      setRoute(p);
      setStatus('Route calculated');
      return;
    }
    // reset if both set
    setStart([mapX, mapY]);
    setEnd(null);
    setRoute([]);
    setStatus('Tap to set end point');
  };

  const reset = () => {
    setStart(null);
    setEnd(null);
    setRoute([]);
    setStatus('Tap to set start point');
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pathfinding</Text>
        <TouchableOpacity onPress={reset} style={styles.resetBtn}>
          <Text style={{ color: '#fff' }}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={{ marginBottom: 8 }}>{status}</Text>
        <View
          style={{ width: MAP_W, height: MAP_H, borderWidth: 1, borderColor: '#ddd' }}
          ref={containerRef}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onMapPress}
        >
          <Svg width={MAP_W} height={MAP_H}>
            <SvgImage href={FloorPlanImage} width={MAP_W} height={MAP_H} preserveAspectRatio="xMidYMid slice" />
            {route.length > 0 && (
              <Polyline
                points={route.map(([x, y]) => `${scaleX(x)},${scaleY(y)}`).join(' ')}
                stroke="#3b82f6"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {start && <Circle cx={scaleX(start[0])} cy={scaleY(start[1])} r={8} fill="#22c55e" />}
            {end && <Circle cx={scaleX(end[0])} cy={scaleY(end[1])} r={8} fill="#ef4444" />}
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  resetBtn: { backgroundColor: '#444', padding: 8, borderRadius: 8 },
  content: { alignItems: 'center' },
});
