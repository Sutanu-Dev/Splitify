import { LightningElement, track, wire } from 'lwc';
import getAllGroups from '@salesforce/apex/splitify_service.getAllGroups';
import { NavigationMixin } from 'lightning/navigation';
import { subscribe, MessageContext } from 'lightning/messageService';
import COMPONENT_COMMUNICATION_CHANNEL from '@salesforce/messageChannel/componentMessageChannel__c';
import defaultgrouppicture from '@salesforce/resourceUrl/defaultgrouppicture';
// import defaultGroupPictureDark from '@salesforce/resourceUrl/defaultGroupPictureDark';
import createGroup from '@salesforce/apex/splitify_service.createGroup';
import { refreshApex } from '@salesforce/apex';


export default class Splitify_homePage extends NavigationMixin(LightningElement) {
    dollarLoader = false;
    defGrpPic = defaultgrouppicture;
    // defGrpPicDark = defaultGroupPictureDark;
    subscription = null;
    isLoading = true;
    groupsExist = false;
    showCreateGroupForm = false;
    allGroups = [];
    allGrpRef = [];

    @wire(getAllGroups, {UserId : localStorage.getItem('userId')})
    groupDetails(result){
        this.allGrpRef = result;
        if(result.data !== undefined && result.data.length === 0){
            this.isLoading = false;
            this.groupsExist = false;
        }

        if(result.data !== undefined && result.data.length > 0){
            this.allGroups = result.data;
            this.groupsExist = true;
            this.isLoading = false;
        }

        if(result.error){
            console.error('Error fetching groups:', result.error);
            this.isLoading = false;
        }
    }
    
    @wire(MessageContext) messageContext;

    setThemeColor() {
        let metaTag = document.querySelector('meta[name="theme-color"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.name = 'theme-color';
          document.head.appendChild(metaTag);
        }
        metaTag.content = '#808080';
    }
    

    connectedCallback(){
        const userid = localStorage.getItem('userId');
        // if(userid !== '001WU00000g5cNrYAI'){
        //     window.location.href = 'https://splitifyy-dev-ed.develop.my.site.com';
        //     return;
        // }

        if(!this.isAuthenticated()){
            this.redirectToLogin();
        }

       

        this.setThemeColor();
        // const body = document.querySelector('body');
        // body.classList.add('darktheme');

        if(!this.subscription){
            this.subscription = subscribe(
                this.messageContext,
                COMPONENT_COMMUNICATION_CHANNEL,
                (message) => this.openCreateGroupForm(message)
            );
        }
    }

    isAuthenticated(){
        return localStorage.getItem('userId') ? true : false;
    }

    redirectToLogin() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
              name: 'login_page__c'
          },
          state : {}
        });
    }

    renderedCallback(){
        refreshApex(this.allGrpRef);
    }


    openCreateGroupForm(message) {
        if (message.action === 'invokeFunction') {
            this.template.querySelector('.create-group-container').style.left = '0';
        }
    }

    closeCreateGroupForm(){
        this.template.querySelector('.create-group-container').style.left = '-120%';
    }

    changeBorder(event){
        const groupName = event.target.value.trim();
        
        if(groupName !== "" || groupName !== null){
            event.target.style.border = "none";
            event.target.style.borderBottom = "2.5px solid";
            event.target.style.borderImageSource = "linear-gradient(90deg, #1b96ff, #d048fd, #2db952)";
            event.target.style.borderImageSlice = "1";
        }
    }
    
    createGroup(){
        this.dollarLoader = true;
        const groupName = this.template.querySelector('input[name="groupname"]');
        if(!groupName.value){
            groupName.style.border = "2px solid #ff0000";
            return this.dollarLoader = false;
        }

        const currency = this.template.querySelector('select[name="currency"]').value;

        createGroup({GroupName : groupName.value, CreatedByUser : localStorage.getItem('userId'), GroupCurrency : currency })
            .then(data => {

                setTimeout(() => {
                    refreshApex(this.allGrpRef);
                }, 500);
                this.dollarLoader = false;
                this.template.querySelector('.create-group-container').style.left = '-100%';
            })
            .catch(error => {
                this.dollarLoader = false;
                console.log('error while creating group', error);
            })
        
    }

    navigateToGroupDetails(event){
        const groupId = event.currentTarget.dataset.groupid;

        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
              name: 'group_details__c'
          },
          state : {
              "groupRecId" : groupId
          }
        });
    }

}