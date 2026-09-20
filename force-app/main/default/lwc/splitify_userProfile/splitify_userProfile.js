import { LightningElement, wire } from 'lwc';
import {NavigationMixin} from 'lightning/navigation';
import getUserDetails from '@salesforce/apex/splitify_service.getUserDetails';
import defaultProfilePicture from '@salesforce/resourceUrl/defaultprofilepicture';
import { publish, subscribe, MessageContext } from 'lightning/messageService';
import COMPONENT_COMMUNICATION_CHANNEL from '@salesforce/messageChannel/componentMessageChannel__c';
import updateUserDetails from '@salesforce/apex/splitify_service.updateUserDetails';
import { refreshApex } from '@salesforce/apex';

export default class Splitify_userProfile extends LightningElement {
    user = {};
    profilePicture;
    subscription = null;
    userDetails = true;
    userDetailsRef = {};

    userUPI = '';
    userPhone = '';
    formUPI = ''
    formPhone = ''

    @wire(getUserDetails, {userId : localStorage.getItem('userId')})
    userDetails(result){
        this.userDetailsRef = result;
        if(result.data == undefined){
            return;
        }
        this.user = result.data;
        this.userUPI = result.data.Upi_Id__c ? result.data.Upi_Id__c : '--------@----';
        this.userPhone = result.data.Phone ? result.data.Phone : 'XXX-XXX-XXXX';
        this.profilePicture = this.user?.Profile_Picture__c ? this.user.Profile_Picture__c : defaultProfilePicture;
    
        this.formUPI = result.data.Upi_Id__c ? result.data.Upi_Id__c : '';
        this.formPhone = result.data.Phone ? result.data.Phone : '';
    }

    @wire(MessageContext) messageContext;

    connectedCallback(){
        if(!this.isAuthenticated()){
            this.redirectToLogin();
        }

        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                COMPONENT_COMMUNICATION_CHANNEL,
                (message) => this.openUserEditForm(message)
            );
        }
    }

    isAuthenticated(){
        return localStorage.getItem('userId') ? true : false;
    }

    redirectToLogin(){
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
              name: 'login_page__c'
            },
            state : {
            }
        });
    }
    
    openUserEditForm(message){
        if(message.action === 'invokeFunction'){
            this.userDetails = false;
        }
    }

    hideUserEditForm(){
        this.userDetails = true;
        this.invokeOtherCmpntFunction();
    }

    invokeOtherCmpntFunction(){
        const payload = { action: 'showEditBtn'};
        publish(this.messageContext, COMPONENT_COMMUNICATION_CHANNEL, payload);
    }

    updateUserDetails(event){
        event.preventDefault();
        const name = event.target.username.value;
        const country = event.target.country.value;
        const email = event.target.email.value;
        const phone = event.target.phone.value;
        const upi = event.target.upi.value;

        updateUserDetails({
            userId : localStorage.getItem('userId'),
            Name : name,
            Country : country,
            Email : email,
            Phone : phone,
            UPI : upi,
            ProfilePicture: ''
        })
        .then(() => {
            this.hideUserEditForm();
            return refreshApex(this.userDetailsRef);
        })
        .catch(error => {
            console.error(error);
        });
    }

    handleProfilePictureButton(){
        const fileInput = this.template.querySelector('.file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    uploadProfilePicture(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const maxWidth = 800; 
                    const maxHeight = 800; 

                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    ctx.drawImage(img, 0, 0, width, height);

                    const profilePic = canvas.toDataURL('image/jpeg', 0.5);

                    if(profilePic.length > 131072){
                        this.showModal("isFileTooLarge");
                        return;
                    }

                    this.profilePicture = profilePic;
                    
                    this.saveProfilePicture(profilePic);
                };
            };
            reader.readAsDataURL(file); 
        }
    }

    saveProfilePicture(profilePicture){
        updateUserDetails({ 
            userId: localStorage.getItem('userId'), 
            ProfilePicture: profilePicture,
            Name : '',
            Country : '',
            Email : '',
            Phone : '' })
        .then(() => {
            return refreshApex(this.userDetailsRef);
        })
        .catch(error => {
            console.error(error);
        })
    }

    showSignOutModal(){
        const signOutModal = this.template.querySelector('.modal');
        signOutModal.blur();
        signOutModal.showModal();
    }

    hideSignOutModal(){
        const signOutModal = this.template.querySelector('.modal');
        signOutModal.close();
    }

    navigateToLoginPage(){
        localStorage.removeItem('userId');

        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'login_page__c'
            },
            state : {
            }
        });
    }
}