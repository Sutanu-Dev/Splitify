import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex'
import getGroupDetails from '@salesforce/apex/splitify_service.getGroupDetails';
import updateGroupDetails from '@salesforce/apex/splitify_service.updateGroupDetails';
import removeGroupUser from '@salesforce/apex/splitify_service.removeGroupUser';
import deleteGroup from '@salesforce/apex/splitify_service.deleteGroup';
import defaultProfilePicture from '@salesforce/resourceUrl/defaultprofilepicture';
import noGroupPictire from '@salesforce/resourceUrl/noGroupPictire'
import updateGroupMembers from '@salesforce/apex/splitify_service.updateGroupMembers';
import createGroupExpenseRecord from '@salesforce/apex/firebaseService.createGroupExpenseRecord';
import fetchGroupExpenses from '@salesforce/apex/firebaseService.fetchGroupExpenses';
// import updateGroupCurrency from '@salesforce/apex/splitify_service.updateGroupCurrency';


const Currency = {
    India : '₹',
    USA : '$'
};

export default class Slitify_groupDetailsPage extends NavigationMixin(LightningElement) {
    grpPicNotAvail = noGroupPictire;
    defProPic = defaultProfilePicture;
    sharedEqually = true;
    withSelectedMembers = false;
    groupId = '';
    groupCover = '';
    group = {};
    grpDetailsRef = null;
    currencySymbal = Currency.India;
    @track groupTotal = 0;
    @track userTotal = 0;
    ifLeaveGroup = false;
    ifDeleteGroup = false;
    ifEditGroup = false;
    groupMembers = [];
    groupExpenses = [];
    grpExpensesRef = null;
    loggedInUserId = '';
    isAmount = true;
    isPart = false;
    isPercentage = false;
    dollarLoader = false;
    groupAlbumId = '';
    ytAlbumId = '';
    linkToCopy = '';

    @wire(CurrentPageReference)
    getStateParameters(currPage) {
        if (currPage?.state?.groupRecId) {
            this.groupId = currPage.state.groupRecId;
            this.linkToCopy = 'https://splitify-dev-ed.develop.my.site.com/production/invite?id='+this.groupId;
        }
    }

    @wire(getGroupDetails, { GroupId : '$groupId' })
        groupDetails(result){
            this.grpDetailsRef = result;
            if(result.data){
                this.groupCover = result.data.Group_Picture__c;
                this.group = result.data;
                this.groupMembers = result.data.User_Groups__r;
                this.groupAlbumId = result.data.Album_Id__c;
                this.ytAlbumId = result.data.YT_Album_Id__c;
                
            }

            if(result.error){
                console.error(result.error);
            }
        }

    @wire(fetchGroupExpenses, { GroupId : '$groupId'})
    groupExpenseList(result){
        this.grpExpensesRef = result;
        if(result.data){
            this.groupExpenses = [...result.data].reverse();

            Promise.resolve().then(() => this.calcGroupAndUserTotal(result.data));
        }

        if(result.error){
            console.error(result.error);
        }
    }

    calcGroupAndUserTotal(groupExpenses) {
        const userId = localStorage.getItem('userId');
        let temGrpTotal = 0;
        const temUserTotal = groupExpenses.reduce((acc, expense) => {
            temGrpTotal += expense.amount;
            let userShare = expense.sharedWith.find(item => item.id === userId);
            return acc + (userShare ? Number(userShare.amount) : 0);
        }, 0);

        this.userTotal = Number(temUserTotal.toFixed(2));
        this.groupTotal = Number(temGrpTotal.toFixed(2));
    }

    get ifCreatedByUser(){
        return this.group.Created_By__c === localStorage.getItem('userId');
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

                    const groupPic = canvas.toDataURL('image/jpeg', 0.5);

                    if(groupPic.length > 131072){
                        this.showModal("isFileTooLarge");
                        return;
                    }

                    this.groupCover = groupPic;
                    
                    this.saveProfilePicture(groupPic);
                };
            };
            reader.readAsDataURL(file); 
        }
    }

    saveProfilePicture(groupCover){
        updateGroupDetails({ 
            GroupId: this.groupId, 
            GroupCover: groupCover,
            Name : ''
            })
        .then(() => {
            
        })
        .catch(error => {
            console.error(error);
        })
    }

    handleLeaveGroup(){
        this.ifLeaveGroup = true;
        const dialog = this.template.querySelector('.modal');
        dialog.showModal();
        const groupMenu = this.template.querySelector(".group-menu");
        groupMenu.open = !groupMenu.open;
    }

    cancelLeaveGroup(){
        const dialog = this.template.querySelector('.modal');
        dialog.close();
        this.ifLeaveGroup = false;
    }

    removeUser(){
        this.cancelLeaveGroup();
        removeGroupUser({ 
            GroupId: this.groupId, 
            UserId: localStorage.getItem('userId')
            })
        .then(() => {
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                  name: 'Home'
              },
              state : {
              }
            });
        })
        .catch(error => {
            console.error(error);
        })
    }

    handleDeleteGroup(){
        this.ifDeleteGroup = true;
        const dialog = this.template.querySelector('.modal');
        dialog.showModal();
        const groupMenu = this.template.querySelector(".group-menu");
        groupMenu.open = !groupMenu.open;
    }

    cancelDeleteGroup(){
        const dialog = this.template.querySelector('.modal');
        dialog.close();
        this.ifDeleteGroup = false;
    }

    deleteGroup(){
        this.cancelDeleteGroup();
        deleteGroup({ 
            GroupId: this.groupId
            })
        .then(() => {
            localStorage.setItem('refreshGroups', 'true');
            this[NavigationMixin.Navigate]({
                type: 'comm__namedPage',
                attributes: {
                  name: 'Home'
              },
              state : {
              }
            });
        })
        .catch(error => {})
    }

    handleEditGroup(){
        this.ifEditGroup = true;
        const dialog = this.template.querySelector('.modal');
        dialog.showModal();
    }

    cancelEditGroup(){
        const dialog = this.template.querySelector('.modal');
        dialog.close();
        this.ifEditGroup = false;
    }

    saveGroupName(){
        const groupName = this.template.querySelector('.edit-group-card input').value.trim();
        if(!groupName){
            this.template.querySelector('.edit-group-card .error').innerText = 'Field Cannot be null';
            return;
        }else if(groupName === this.group.Name){
            this.template.querySelector('.edit-group-card .error').innerText = 'No change detected';
            return;
        }
        this.group = { ...this.group, Name: groupName }

        this.cancelEditGroup();
        updateGroupDetails({ 
            GroupId: this.groupId, 
            GroupCover: '',
            Name : groupName
            })
        .then(() => {
            
        })
        .catch(error => {
            console.error(error);
        })
    }

    // ************************************************
    selectedUserIds = [];
    filteredGrpMembers = [];
    sharedWithUserList = [];

    renderedCallback(){
        refreshApex(this.grpDetailsRef);
        refreshApex(this.grpExpensesRef);
    }
    
    handleManageMember(){
        this.template.querySelector('.manage-user-container').style.left = '0';
        const loggedInUserId = localStorage.getItem('userId');
        this.filteredGrpMembers = this.group.User_Groups__r.filter(user => user.Account__r.Id !== loggedInUserId ) ;
        this.toggleScroll('off');
        this.handleGroupMenu();
    }

    closeManageMemberForm(){
        this.template.querySelector('.manage-user-container').style.left = '-120%';
        this.toggleScroll('on');
    }

    selectUser(event){
        const userId = event.currentTarget.dataset.id;
        const userExists = this.selectedUserIds.some(user => user === userId);
        const checkIcon = event.currentTarget.querySelector(".material-symbols-outlined");
        if(userExists){
            this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
            checkIcon.style.display = "none";
        } else {
            this.selectedUserIds.push(userId);
            checkIcon.style.display = "block";
        }
    }

    syncGroupMembers(){
        if(this.selectedUserIds.length === 0){
            this.showToastNotification('No Users Selected!', 'error');
            return;
        }
        updateGroupMembers({GroupId : this.groupId, UserIds: this.selectedUserIds})
        .then(() => {
            this.closeManageMemberForm();
            this.showToastNotification('Group Members Updated!', 'success');
            this.toggleScroll('on');
            refreshApex(this.grpDetailsRef);
        })
        .catch(error => {
            this.toggleScroll('on');
            console.error('Error updating group members:', error);
        });
    }

    openAddExpenseForm(){
        this.template.querySelector('.create-expense-container').style.left = '0%';
        this.loggedInUserId = localStorage.getItem('userId');

        const GDC = this.template.querySelector('.group-details-container')
        GDC.setAttribute('inert', '');
        
        this.toggleScroll('off');
    }

    closeAddExpenseForm(){
        this.template.querySelector('.create-expense-container').style.left = '-120%';

        const GDC = this.template.querySelector('.group-details-container')
        GDC.removeAttribute('inert', '');

        this.toggleScroll('on');
    }

    toggleScroll(swtch){
        const body = document.querySelector('body');
        if(swtch === 'off'){
            body.style.overflow = 'hidden'
        } else {
            body.style.overflow = 'auto'
        }
    }

    handleSharedWithUser(event){
        const userId = event.currentTarget.dataset.id;
        const name = event.currentTarget.dataset.name;
        const sharedUser = {
            id : userId,
            name : name
        }
        if(this.sharedWithUserList.some(u => u.id === sharedUser.id)){
            this.sharedWithUserList = this.sharedWithUserList.filter(user => user.id !== sharedUser.id);
            const checkIcon = event.currentTarget.querySelector(".material-symbols-outlined");
            checkIcon.style.display = "none";
        } else {
            this.sharedWithUserList.push(sharedUser);
            const checkIcon = event.currentTarget.querySelector(".material-symbols-outlined");
            checkIcon.style.display = "block";
        }

    }

    handleSharingUsers(event){
        const sharingSettings = event.target.value;

        if(sharingSettings === 'Unequally'){
            this.sharedWithUserList = [];
            this.sharedEqually = false;
            this.withSelectedMembers = true;        
        } else {
            this.sharedWithUserList = [];
            this.sharedEqually = true;
            this.withSelectedMembers = false;
            
            this.isPercentage = false;
            this.isPart = false;
        }
    }

    handleMemberOption(event){
        const memberOption = event.target.value;

        if(memberOption === 'Selected'){
            this.sharedWithUserList = [];
            this.withSelectedMembers = true;
        } else {
            this.sharedWithUserList = [];
            this.withSelectedMembers = false;
        }

    }

    createExpense(event){
        event.preventDefault();
        this.dollarLoader = true;
        const title = event.target.expensename.value.trim().split(" ").filter(item => item !== "").join(" ");
        const amount = event.target.amount.value;
        const paidBy = event.target.paidby;
        const paidByUserId = paidBy.value;
        let paidByUserName = paidBy.options[paidBy.selectedIndex].text;

        if(paidByUserName === 'Paid By You'){
            const matchingNames = Array.from(paidBy.options)
            .filter(option => option.value === paidByUserId)
            .map(option => option.textContent.trim());

            paidByUserName = matchingNames[1];
        }

        if(!title){
            event.target.expensename.style.outline = '2px solid #ff6666';
            this.dollarLoader = false;
            return;
        } else {
            event.target.expensename.style.removeProperty("outline");
        }

        if(!amount){
            event.target.amount.style.outline = '2px solid #ff6666';
            this.dollarLoader = false;
            return;
        } else {
            event.target.amount.style.removeProperty("outline");
        }

        const sharedWith = event?.target?.share?.value;
        const memberOption = event?.target?.memberoption?.value;
        const shareType = event?.target?.sharetype?.value;

        if(sharedWith === 'Equally' && memberOption === 'All'){
            const sharedAmount = (amount / this.groupMembers.length).toFixed(2);

            this.sharedWithUserList = this.groupMembers.map(member => {
                return {
                    id : member.Account__r.Id, 
                    name : member.Account__r.Name, 
                    amount : sharedAmount
                }
            });
        }

        if (sharedWith === 'Equally' && memberOption === 'Selected'){
            if(this.sharedWithUserList.length === 0){
                const Message = `Please select at least one member.`;
                this.dollarLoader = false;
                this.showErrorMessage(Message);
                return;
            }
            const sharedAmount = (amount / this.sharedWithUserList.length).toFixed(2);
            this.sharedWithUserList.forEach(sharedUser => {sharedUser["amount"] = sharedAmount});
        }

        let proceed = true;
        if(sharedWith === 'Unequally'){
            proceed = this.handleShareUnequally(shareType);
        }

        if(!proceed){
            this.dollarLoader = false;
            return;
        }

        createGroupExpenseRecord({ GroupId : this.groupId, SharedWithOption : sharedWith, MemberOption : memberOption, Title: title , Amount: amount, PaidByUserId: paidByUserId,PaidByUserName: paidByUserName, ShareType: shareType, SharedUsers: this.sharedWithUserList})
        .then(() => {
            refreshApex(this.grpExpensesRef);
            this.dollarLoader = false;
            this.closeAddExpenseForm();
            this.groupTotal += Number(amount);
            this.sharedWithUserList = [];
            this.sharedEqually = true;
            this.withSelectedMembers = false;
            this.template.querySelector('.create-expense-form').reset();
        })
        .catch(error => {
            console.error('Error creating expense:', error);
            this.dollarLoader = false;
        });
    }

    handleShareUnequally(shareType){
        this.sharedWithUserList = [];
        const getAllMembers = [...this.template.querySelectorAll('input[name="indvamount"]')].filter(member => member.value);
        const expenseAmount = this.template.querySelector('input[name="amount"]').value;

        const totalSharedAmount = getAllMembers.reduce((acc, member) => {
            return acc += Number(member.value);
        },0)

        if(shareType === 'Amount'){
            if(totalSharedAmount != expenseAmount){
                const Message = `Oops! The shared amounts should add up to ₹${expenseAmount}. Currently, the total is ₹${totalSharedAmount}. Please adjust accordingly`;
                this.showErrorMessage(Message);
                return false;
            }

            this.sharedWithUserList = getAllMembers.map(member => {
                return {
                    id : member.dataset.id, 
                    name : member.dataset.name, 
                    amount : Number(member.value)
                }
            });
        } else if(shareType === 'Parts'){

            if(getAllMembers.length === 0){
                const Message = `Please fill out at least one field.`;
                this.showErrorMessage(Message);
                return false;
            }

            if(getAllMembers.length === 1){
                this.sharedWithUserList = getAllMembers.map(member => {
                    return {
                        id : member.dataset.id, 
                        name : member.dataset.name, 
                        amount : Number(expenseAmount)
                    }
                });
            }

            if(getAllMembers.length > 1){
                const onePart = Number(expenseAmount) / totalSharedAmount;

                this.sharedWithUserList = getAllMembers.map(member => {
                    return {
                        id : member.dataset.id, 
                        name : member.dataset.name, 
                        amount : Number((onePart * Number(member.value)).toFixed(2))
                    }
                });
            }
        } else if(shareType === 'Percent'){
            if(totalSharedAmount !== 100){
                const Message = `Oops! Total share should be 100%. Currently, the total is ${totalSharedAmount}%.`;
                this.showErrorMessage(Message);
                return false;
            }

            this.sharedWithUserList = getAllMembers.map(member => {
                return {
                    id : member.dataset.id, 
                    name : member.dataset.name, 
                    amount : Number(((Number(member.value) / 100) * Number(expenseAmount)).toFixed(2))
                }
            });
        }

        return true;
    }

    closeShareModal(){
        const shareModal = this.template.querySelector('.share-modal');
        shareModal.close();
    }

    navigateToItemDetailsPage(event){
        const itemId = event.currentTarget.dataset.id;
        
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'group_item_details__c'
            },
            state : {
                itemId: itemId,
                groupId: this.groupId
            }
        });
    }

    navigateToSettleUpPage(){
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'settle_up__c'
            },
            state : {
                groupId: this.groupId
            }
        });
    }

    handleShareType(event){
        const shareType = event.target.value;
        if(shareType === 'Parts'){
            this.isPart = true;
            this.isPercentage = false;
            this.isAmount = false;
        } else if(shareType === 'Percent'){
            this.isPercentage = true;
            this.isPart = false;
            this.isAmount = false;
        } else {
            this.isPercentage = false;
            this.isPart = false;
            this.isAmount = true;
        }
    }

    showErrorMessage(message){
        const shareModal = this.template.querySelector('.share-modal');
        const messageEL = shareModal.querySelector('h3');
        messageEL.textContent = message;
        shareModal.showModal();
    }

    connectedCallback(){
            if(!this.isAuthenticated()){
                this.redirectToLogin();
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
                state : {}
            });
        }


    copyLinkToClipboard(){
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(this.linkToCopy)
                .then(() => {
                    this.showToastNotification('Link Copied!', 'success');
                })
                .catch((err) => {
                    this.showToastNotification('Error!', 'error');
                    console.error(err);
                });

                const groupMenu = this.template.querySelector(".group-menu");
                groupMenu.open = !groupMenu.open;
            }
        }

    showToastNotification(message , type){
        const toast = this.template.querySelector('c-custom-toast');
        toast.show(message , type);
    }

    handleGroupMenu(){
        const groupMenu = this.template.querySelector(".group-menu");
        groupMenu.open = !groupMenu.open;
    }

    navigateToGroupContent(){
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
              name: 'group_content__c'
            },
            state : {
                albumId : this.groupAlbumId,
                YTalbumId : this.ytAlbumId
            }
        });
    }

    handleGroupCurrency(){
        this.handleGroupMenu()
        const currModal = this.template.querySelector('.currency-modal');
        currModal.showModal();
    }

    closeCurrencyModal(){
        const currModal = this.template.querySelector('.currency-modal');
        currModal.close();
    }

    changeGroupCurrency(){
        const currency = this.template.querySelector('select[name="currency"]').value;
        
        if((currency === 'INR' && this.currencySymbal === '₹') || (currency === 'USD' && this.currencySymbal === '$')){
            this.closeCurrencyModal();
            return;
            
        } else {
            this.currencySymbal = currency === 'INR' ? Currency.India : Currency.USA;
            this.closeCurrencyModal();
        }

        updateGroupCurrency({
            GroupId: this.groupId,
            Crny: currency
        })
        .then(() => {})
        .catch(error => {
            console.error('error updating group currency',error);
        });
    }
}