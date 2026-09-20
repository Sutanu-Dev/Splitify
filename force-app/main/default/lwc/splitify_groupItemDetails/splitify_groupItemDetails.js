import { LightningElement, track, wire } from 'lwc';
import updateGroupExpenseRecord from '@salesforce/apex/firebaseService.updateGroupExpenseRecord';
import deleteExpense from '@salesforce/apex/firebaseService.deleteExpenseItem';
import defaultProfilePicture from '@salesforce/resourceUrl/defaultprofilepicture';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getExpenseItem from '@salesforce/apex/firebaseService.getExpenseItem';
import { getRecord } from 'lightning/uiRecordApi';
import { publish, MessageContext } from 'lightning/messageService';
import COMPONENT_COMMUNICATION_CHANNEL from '@salesforce/messageChannel/componentMessageChannel__c';
import fetchGroupMembers from '@salesforce/apex/splitify_service.fetchGroupMembers';
import { refreshApex } from '@salesforce/apex';

const FIELDS = [
    'Account.Profile_Picture__c'
];

export default class Splitify_groupItemDetails extends NavigationMixin(LightningElement) {
    Currency = {
        India : '₹',
        USA : '$'
    };
    currencySymbal = this.Currency.India;
    defProPic = defaultProfilePicture;
    expenseId;
    expenseTitle = '';
    expenseAmount = 0;
    expenseSharedWith = '';
    expenseMemberOption = '';
    expenseShareType = '';
    groupId;
    @track expense;
    expenseItemRef;
    @track userId;
    userProPic;
    isAmount = true;
    isPart = false;
    isPercentage = false;
    dollarLoader = false;

    @wire(CurrentPageReference)
    getStateParameters(pageReference) {
        if (pageReference && pageReference.state) {
            this.expenseId = pageReference.state.itemId;
            this.groupId = pageReference.state.groupId;
        }
    }

    @wire(getExpenseItem, { GroupId : '$groupId', ExpenseId : '$expenseId'})
    groupExpenseList(result){
        this.expenseItemRef = result;
        if(result.data){
            this.expense = JSON.parse(result.data);
            this.expenseTitle = this.expense.title;
            this.expenseAmount = this.expense.amount;
            this.expenseSharedWith = this.expense.sharedWithOption;
            this.expenseMemberOption = this.expense.memberOption;
            this.userId = this.expense.paidByUserId;
            this.expenseShareType = this.expense.shareType;
            this.sharedWithUserList = [...this.expense.sharedWith];
            this.editedSharedWithUser = [...this.expense.sharedWith];
        }
        if(result.error){
            console.error(result.error);
        }
    }

    @wire(getRecord, { recordId: '$userId', fields: FIELDS })
    wiredRecord({ error, data }) {
        if (data) {
            this.userProPic = data.fields.Profile_Picture__c.value;
            
        } else if (error) {
            console.error('Error fetching user profile picture:', error);
        }
    }

    @wire(fetchGroupMembers, { GroupId : '$groupId'})
        groupMemberList(result){
            if(result.data){
                this.groupMembers = result.data;
            }
            if(result.error){
                console.error('Error fetching group members:', result.error);
            }
        }

    @wire(MessageContext) messageContext;

    publishMessage(){
        const payload = { action : 'clickBackBtn'};
        publish(this.messageContext, COMPONENT_COMMUNICATION_CHANNEL, payload);
    }

    showDeleteWarningPopup(){
        const dialog = this.template.querySelector('.delete-modal');
        dialog.showModal();
    }

    hideDeleteWarningPopup(){
        const dialog = this.template.querySelector('.delete-modal');
        dialog.close();
    }

    deleteExpenseItem(){
        deleteExpense({ExpenseId : this.expenseId, GroupId : this.groupId })
        .then(() => {
            this.hideDeleteWarningPopup();
            this.publishMessage();
        })
        .catch(error => {
            console.error('Error deleting expense:', error);
        })
    }

    showEditPopup(){
        const dialog = this.template.querySelector('.edit-modal');
        dialog.showModal();
    }

    // ************************edit expense**************************
    editedSharedWithUser = [];
    withSelectedMembers = false;
    sharedEqually = false;
    groupMembers = [];
    sharedWithUserList = [];
    combinedUserList = [];

    openEditExpenseForm(){
        this.template.querySelector('.edit-expense-container').style.left = '0%';
        this.selectDefaultPaidBy();
        this.setDefaultSharingOption();
        if(this.expense.sharedWithOption === 'Equally'){
            this.sharedEqually = true;
            this.setDefaultMemberOption();
        } else {
            this.sharedEqually = false;
            this.withSelectedMembers = true;
        }
        this.combineMembers();
        
        if(this.expenseSharedWith === 'Equally' && this.expenseMemberOption === 'Selected'){
            this.sharedEqually = true;
            this.withSelectedMembers = true;
            this.setDefaultMemberOption();
            setTimeout(() => {
                this.checkSharedWithUserList();
            }, 0);
        }

        if(this.expenseShareType === 'Parts'){
            this.isAmount = false;
            this.isPart = true;
            this.isPercentage = false;
            this.setDefaultShareType();
            this.clearUserList();
        } else if(this.expenseShareType === 'Percent'){
            this.isAmount = false;
            this.isPart = false;
            this.isPercentage = true;
            this.setDefaultShareType();
            this.clearUserList();
        } else {
            this.isAmount = true;
            this.isPart = false;
            this.isPercentage = false;
            this.setDefaultShareType();
        }
    }

    closeEditExpenseForm(){
        this.template.querySelector('.edit-expense-container').style.left = '-120%';
    }

    selectDefaultPaidBy() {
        const paidBy = this.template.querySelector('select[name="paidby"]');
        if (paidBy) {
            paidBy.value = this.expense.paidByUserId;
        }
    }

    setDefaultSharingOption() {
        const sharedWith = this.template.querySelector('select[name="share"]');
        if (sharedWith) {
            sharedWith.value = this.expense.sharedWithOption;
        }
    }

    setDefaultMemberOption() {
        setTimeout(() => {
            const memberOption = this.template.querySelector('select[name="memberoption"]');
            if (memberOption) {
                memberOption.value = this.expense.memberOption;
            }
        }, 0);
    }

    setDefaultShareType(){
        const shareType = this.template.querySelector('select[name="sharetype"]');
        if (shareType) {
            shareType.value = this.expense.shareType;
        }
    }

    handleSharingUsers(event){
        const sharingSettings = event.target.value;

        if(sharingSettings === 'Unequally'){
            this.sharedEqually = false;
            this.withSelectedMembers = true;        
        } else {
            this.sharedEqually = true;
            this.withSelectedMembers = false;        
        }
    }

    handleMemberOption(event){
        const memberOption = event.target.value;

        if(memberOption === 'Selected'){
            this.withSelectedMembers = true;
            this.editedSharedWithUser = [...this.expense.sharedWith];
            setTimeout(() => {
                this.checkSharedWithUserList();
            }, 0);
        } else {
            this.withSelectedMembers = false;
        }
    }

    handleShareType(event){
        const shareType = event.target.value;
        if(shareType === 'Parts'){
            this.isPart = true;
            this.isPercentage = false;
            this.isAmount = false;
            this.clearUserList();
        } else if(shareType === 'Percent'){
            this.isPercentage = true;
            this.isPart = false;
            this.isAmount = false;
            this.clearUserList();
        } else {
            this.isPercentage = false;
            this.isPart = false;
            this.isAmount = true;
            this.combineMembers();
        }
    }

    combineMembers(){
        let combinedUserList = JSON.parse(JSON.stringify(this.sharedWithUserList));
        
        this.groupMembers.forEach(member => {
            let existingUser = combinedUserList.find(user => user.id === member.Account__c);
            
            if (existingUser) {
                existingUser.propic = member.Account__r.Profile_Picture__c;

            } else {
                combinedUserList.push({
                    id: member.Account__r.Id,
                    name: member.Account__r.Name,
                    propic: member.Account__r.Profile_Picture__c,
                    amount: null
                });
            }
        });

        this.combinedUserList = JSON.parse(JSON.stringify(combinedUserList));
    }

    clearUserList(){
        let combinedUserList = [];
        this.groupMembers.forEach(member => {
            combinedUserList.push({
                id: member.Account__r.Id,
                name: member.Account__r.Name,
                propic: member.Account__r.Profile_Picture__c,
                amount: null
            });
        })

        this.combinedUserList = JSON.parse(JSON.stringify(combinedUserList));
    }

    updateAmount(event){
        let userId = event.target.dataset.id;
        let newValue = event.target.value;

        this.combinedUserList = this.combinedUserList.map(user => {
            if (user.id === userId) {
                return { ...user, amount: newValue };
            }
            return user;
        });
    }

    checkSharedWithUserList(){
        const toBeCheckedEl = this.template.querySelectorAll('div[data-checkeduser]');

        toBeCheckedEl.forEach(el => {
            let userId = el.dataset.checkeduser;
            let userExist = this.sharedWithUserList.find(user => user.id === userId)
            if(userExist){
                el.style.display = 'block';
            }
        })
    }

    handleSharedWithUser(event){
        const userId = event.currentTarget.dataset.id;
        const name = event.currentTarget.dataset.name;
        const amount = event.currentTarget.dataset.amount;
        const sharedUser = {
            id : userId,
            name : name
        }
        if(this.editedSharedWithUser.some(u => u.id === sharedUser.id)){
            this.editedSharedWithUser = this.editedSharedWithUser.filter(user => user.id !== sharedUser.id);
            const checkIcon = event.currentTarget.querySelector(".material-symbols-outlined");
            checkIcon.style.display = "none";
        } else {
            this.editedSharedWithUser.push(sharedUser);
            const checkIcon = event.currentTarget.querySelector(".material-symbols-outlined");
            checkIcon.style.display = "block";
        }
    }

    editExpense(event){
        event.preventDefault();
        this.dollarLoader = true;
        const title = event.target.expensename.value.trim().split(" ").filter(item => item !== "").join(" ");
        const amount = event.target.amount.value;
        const paidBy = event.target.paidby;
        const paidByUserId = paidBy.value;
        let paidByUserName = paidBy.options[paidBy.selectedIndex].text;

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
            this.editedSharedWithUser = [];
            this.editedSharedWithUser = this.groupMembers.map(member => {
                return {
                    id : member.Account__r.Id, 
                    name : member.Account__r.Name, 
                    amount : sharedAmount
                }
            });
        }

        if (sharedWith === 'Equally' && memberOption === 'Selected'){
            if(this.editedSharedWithUser.length === 0){
                const Message = `Please select at least one member.`;
                this.dollarLoader = false;
                this.showErrorMessage(Message);
                return;
            }

            const sharedAmount = (amount / this.editedSharedWithUser.length).toFixed(2);
            this.editedSharedWithUser.forEach(sharedUser => {sharedUser["amount"] = sharedAmount});
        }

        let proceed = true;
        if(sharedWith === 'Unequally'){
            proceed = this.handleShareUnequally(shareType);
        }

        if(!proceed){
            this.dollarLoader = false;
            return;
        }

        updateGroupExpenseRecord({ GroupId : this.groupId, 
            ExpenseId : this.expenseId,
            SharedWithOption : sharedWith,
            MemberOption : memberOption,
            Title: title , 
            Amount: amount, 
            PaidByUserId: paidByUserId,
            PaidByUserName: paidByUserName, 
            SharedUsers: this.editedSharedWithUser,
            ShareType: shareType })
        .then(() => {
            refreshApex(this.expenseItemRef);
            this.dollarLoader = false;
            this.closeEditExpenseForm();
            this.editedSharedWithUser = [];
        })
        .catch(error => {
            console.error('Error creating expense:', error);
            this.dollarLoader = false;
        });
    }

    handleShareUnequally(shareType){
        this.editedSharedWithUser = [];

        const getAllMembers = [...this.template.querySelectorAll('input[name="indvamount"]')].filter(member => member.value != 0 && member.value );
        const expenseAmount = this.template.querySelector('input[name="amount"]').value;

        const totalSharedAmount = getAllMembers.reduce((acc, member) => {
            return acc += Number(member.value);
        },0)

        if(shareType === 'Amount'){
            console.log('amount');
            if(totalSharedAmount != expenseAmount){
                const Message = `Oops! The shared amounts should add up to ₹${expenseAmount}. Currently, the total is ₹${totalSharedAmount}. Please adjust accordingly`;
                this.showErrorMessage(Message);
                return false;
            }

            this.editedSharedWithUser = getAllMembers.map(member => {
                return {
                    id : member.dataset.id, 
                    name : member.dataset.name, 
                    amount : Number(Number(member.value).toFixed(2))
                }
            });
        } else if(shareType === 'Parts'){
            if(getAllMembers.length === 0){
                const Message = `Please fill out at least one field.`;
                this.showErrorMessage(Message);
                return false;
            }

            if(getAllMembers.length === 1){
                this.editedSharedWithUser = getAllMembers.map(member => {
                    return {
                        id : member.dataset.id, 
                        name : member.dataset.name, 
                        amount : Number(expenseAmount)
                    }
                });
            }

            if(getAllMembers.length > 1){
                const onePart = Number(expenseAmount) / totalSharedAmount;

                this.editedSharedWithUser = getAllMembers.map(member => {
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

            this.editedSharedWithUser = getAllMembers.map(member => {
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

    showErrorMessage(message){
        const shareModal = this.template.querySelector('.share-modal');
        const messageEL = shareModal.querySelector('h3');
        messageEL.textContent = message;
        shareModal.showModal();
    }

}