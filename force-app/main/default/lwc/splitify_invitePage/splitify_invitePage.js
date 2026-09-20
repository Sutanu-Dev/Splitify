import { LightningElement, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import addToGroup from '@salesforce/apex/splitify_service.addToGroup';

export default class Splitify_invitePage extends NavigationMixin(LightningElement) {

isLoading = true;
showError = '';
hasJoinedGroup = false;

@wire(CurrentPageReference)
    pageRef(currPage){
        const groupId = currPage.state.id;

        if(!groupId || this.hasJoinedGroup){
            return;
        }

        if(!this.isAuthenticated()){
            localStorage.setItem('inviteId', groupId);
            this.redirectToLoginPage();
            return;
        }

        this.hasJoinedGroup = true;

        addToGroup({GroupId : groupId, UserId: localStorage.getItem('userId')})
        .then(() => {
            this.navigateToHomePage();
        })
        .catch((error) => {
            this.showError = error.body.exceptionType + ' : '+ error.body.message;
            console.error('error while adding user to group : ',error);
        })
            
    }

    isAuthenticated(){
        return localStorage.getItem('userId') ? true : false;
    }

    redirectToLoginPage() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'login_page__c'
            },
            state : {}
        });
    }

    navigateToHomePage() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Home'
            },
            state : {}
        });
    }
}