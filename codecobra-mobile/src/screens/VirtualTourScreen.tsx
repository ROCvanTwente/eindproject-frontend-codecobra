import { Text, View } from "react-native";
import { useBleBeacons } from "../hooks/useBleBeacons";

const EXHIBIT_DATA: Record<number, { name: string, info: string }> = {
    1: { name: "Lokaal 1", info: "Dit is informatie over lokaal 1." },
    2: { name: "Lokaal 2", info: "Dit is informatie over lokaal 2." },
    3: { name: "Lokaal 3", info: "Dit is informatie over lokaal 3." },
    4: { name: "Lokaal 4", info: "Dit is informatie over lokaal 4." },
}

const VirtualTourScreen: React.FC = () => {
    const { closestBeacon } = useBleBeacons();

    const currentExhibit = closestBeacon ? EXHIBIT_DATA[closestBeacon.minor] : null;

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fcfcfc' }}>
            {currentExhibit ? (
                <View>
                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{currentExhibit.name}</Text>
                    <Text>{currentExhibit.info}</Text>
                </View>
            ) : (
                <Text>Move closer to a beacon to see exhibit information.</Text>
            )}
        </View>
    )

}

export default VirtualTourScreen;
