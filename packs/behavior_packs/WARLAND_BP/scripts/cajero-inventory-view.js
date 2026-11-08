import { ModalFormData } from '@minecraft/server-ui';
import { cashInventoryIcons } from './cajero-inventory-icons.js';
// Only withdrawal uses a snapshot. Consignar has the engine's movable inventory.
// Three label channels per displayed slot carry texture, quantity and real name.
export function cashWithdrawalForm(p, balance) {
    const form = new ModalFormData().title('WL_CASH_WITHDRAW').textField('', 'Cantidad', { defaultValue: '' }).label('Saldo: ' + balance.toLocaleString('es-CO') + ' WC');
    const box = p.getComponent('minecraft:inventory').container;
    for (const slot of [...Array.from({ length: 27 }, (_, i) => i + 9), ...Array.from({ length: 9 }, (_, i) => i)]) {
        const item = box.getItem(slot);
        form.label(item ? (cashInventoryIcons[item.typeId] ?? 'textures/ui/warland_cajero/unknown') : 'textures/ui/warland_cajero/empty');
        form.label(item && item.amount > 1 ? String(item.amount) : '');
        form.label(item ? (item.nameTag ?? { translate: item.localizationKey }) : '');
    }
    return form.submitButton('Confirmar retiro');
}
