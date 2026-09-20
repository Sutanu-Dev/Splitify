import { LightningElement, api } from 'lwc';

export default class CustomToast extends LightningElement {
    showToast = false;
    variant = '';
    icon = '';
    toastMessage = '';

    @api
    show(message, variant) {
        this.toastMessage = message;
        this.variant = variant;
        this.icon = variant === 'success' ? 'check_circle' : 'error';
        this.showToast = true;
        
        setTimeout(() => {
            this.showToast = false;
        }, 3000);
    }
}