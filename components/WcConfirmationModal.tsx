// components/WcConfirmationModal.tsx
import { Link, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { respondToWcRequest } from '../services/WalletConnectService';
import { useAppStore } from '../store/appStore';
import { Colors } from '../theme/colors';

export const WcConfirmationModal = () => {
    const { isDarkMode, wcRequest } = useAppStore();
    const theme = isDarkMode ? Colors.dark : Colors.light;

    // Jika tidak ada request, jangan render apa-apa
    if (!wcRequest || !wcRequest.isVisible) return null;

    const handleApprove = () => respondToWcRequest(true);
    const handleReject = () => respondToWcRequest(false);

    // Format tampilan data agar lebih rapi
    const displayData = wcRequest.params
        ? JSON.stringify(wcRequest.params, null, 2).substring(0, 300) + '...'
        : 'No data';

    return (
        <Modal transparent visible={true} animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>

                    {/* Header Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
                        {wcRequest.method?.includes('sign') ? (
                            <ShieldCheck size={32} color={theme.primary} />
                        ) : (
                            <Link size={32} color={theme.primary} />
                        )}
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>
                        Confirm Action
                    </Text>

                    <View style={styles.content}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Method:</Text>
                            <Text style={[styles.value, { color: theme.text }]}>{wcRequest.method}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Chain ID:</Text>
                            <Text style={[styles.value, { color: theme.text }]}>{wcRequest.chainId}</Text>
                        </View>

                        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 10 }]}>Payload Data:</Text>
                        <ScrollView style={[styles.dataBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'monospace' }}>
                                {displayData}
                            </Text>
                        </ScrollView>
                    </View>

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnReject, { backgroundColor: theme.error + '20' }]}
                            onPress={handleReject}
                        >
                            <ShieldAlert size={20} color={theme.error} />
                            <Text style={[styles.btnText, { color: theme.error }]}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.btnApprove, { backgroundColor: theme.primary }]}
                            onPress={handleApprove}
                        >
                            <ShieldCheck size={20} color="#FFF" />
                            <Text style={[styles.btnText, { color: '#FFF' }]}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    box: {
        width: '100%',
        maxWidth: 400,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center'
    },
    iconContainer: {
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16
    },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    content: { width: '100%', marginBottom: 24 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '500' },
    value: { fontSize: 14, fontWeight: '600' },
    dataBox: {
        maxHeight: 150,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4
    },
    buttons: { flexDirection: 'row', width: '100%', gap: 12 },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    btnReject: { borderWidth: 1, borderColor: 'transparent' }, // Border handled by bg opacity
    btnApprove: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    btnText: { fontSize: 16, fontWeight: '700' }
});