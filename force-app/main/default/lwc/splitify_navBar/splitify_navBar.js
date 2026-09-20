import { LightningElement, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { publish, subscribe, MessageContext } from 'lightning/messageService';
import COMPONENT_COMMUNICATION_CHANNEL from '@salesforce/messageChannel/componentMessageChannel__c';
import defaultProfilePicture from '@salesforce/resourceUrl/defaultprofilepicture';
import getUserDetails from '@salesforce/apex/splitify_service.getUserDetails';
import { refreshApex } from '@salesforce/apex';

export default class Splitify_navBar extends NavigationMixin(LightningElement) {
    defProPic = defaultProfilePicture;
    showNavBarComponent = true;
    showNavBar = true;
    showCreateGroupButton = true;
    userRef;
    user;
    profilePicture;
    editButton = true;

    @wire(CurrentPageReference)
    pageRef(currPage){
        if(currPage.attributes.name === "login_page__c" || currPage.attributes.name === "invite__c"){
            this.showNavBarComponent = false;
        } else {
            this.showNavBarComponent = true;
        }

        if(currPage.attributes.name === "user_profile__c"){
            this.showNavBar = false;
        } else {
            this.showNavBar = true;
        }

        if(currPage.attributes.name === "Home"){
            this.showCreateGroupButton = true;

            const refresh = localStorage.getItem('refresh');
            if(refresh){
                getUserDetails({userId : localStorage.getItem('userId')})
                .then((data) => {
                    this.user = data;
                    this.profilePicture = this.user?.Profile_Picture__c;
                })
                .catch((error) => {
                    console.error('error refreshing user data',error);
                })
                localStorage.removeItem('refresh');
            }
        } else {
            this.showCreateGroupButton = false;
        }
    }
    
    @wire(getUserDetails, {userId : localStorage.getItem('userId')})
    userDetails(result){
        this.userRef = result;
        if(result.data){
            this.user = result.data;
            this.profilePicture = this.user?.Profile_Picture__c;
        }
    }

    @wire(MessageContext) messageContext;
    
    invokeOtherCmpntFunction(event){
        const payload = { action: 'invokeFunction'};
        publish(this.messageContext, COMPONENT_COMMUNICATION_CHANNEL, payload);
        if(event.currentTarget.dataset.id === 'profile'){
            this.editButton = false;
        }
    }

    renderedCallback(){
        refreshApex(this.userRef);
    }

    navigateToUserProfile(){
        this[NavigationMixin.Navigate]({

            type: 'comm__namedPage',
            attributes: {
                name: 'user_profile__c'
            },
            state : {}
        });
    }

    showSignOutWarningPopup(){
        const dialog = this.template.querySelector('.modal');
        dialog.showModal();
        const userProfileMenu = this.template.querySelector(".user-profile-setting");
        userProfileMenu.open = !userProfileMenu.open;
    }

    hideSignOutWarningPopup(){
        const dialog = this.template.querySelector('.modal');
        dialog.close();
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

    subscription = null;
    connectedCallback(){
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                COMPONENT_COMMUNICATION_CHANNEL,
                (message) => this.showEditButton(message)
            );
        }
    }

    showEditButton(message){
        if(message.action === 'showEditBtn'){
            this.editButton = true;
        }

        if(message.action === 'clickBackBtn'){
            this.template.querySelector('.back-btn').click();
        }
    }

    navigateToPreviousPage(){
        window.history.back();
    }

}