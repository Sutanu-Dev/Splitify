import { LightningElement, wire } from 'lwc';
import defaultProfilePicture from '@salesforce/resourceUrl/defaultprofilepicture';
import { refreshApex } from '@salesforce/apex';
import settleUpCalc from '@salesforce/apex/firebaseService.settleUpCalc';
import createPaidTransection from '@salesforce/apex/firebaseService.createPaidTransection';
import getPaidTransection from '@salesforce/apex/firebaseService.getPaidTransection';
import { CurrentPageReference } from 'lightning/navigation';
import getUserDetails from '@salesforce/apex/splitify_service.getUserDetails';
import { getRecord } from 'lightning/uiRecordApi';
import getUpiId from '@salesforce/apex/splitify_service.getUpiId';

export default class Splitify_settleUpPage extends LightningElement {
    isLoading = true;
    dollarLoader = false;
    userProPic = null;
    defProPic = defaultProfilePicture;
    buttonTitle = 'All Transection ⬇️';
    personal = true;
    personalRecordExist = false;
    settleUpList = [];
    settleUpListRef ;
    paidTransectionList = [];
    paidTransectionListExist = false;
    paidTransectionListRef;
    personalPay = [];
    personalReceive = [];
    groupId;
    transectionExist = true;

    paidObj = {
        amount : 0,
        id : '',
        receiverName : '',
        receiverId : '',
        payerId : '',
        payerName : ''
    }

    @wire(CurrentPageReference)
    getStateParameters(pageReference) {
        if (pageReference && pageReference.state) {
            this.groupId = pageReference.state.groupId;
        }
    }

    @wire(settleUpCalc,{ GroupId : '$groupId' })
        wiredSettleUpDetails(result) {
            this.settleUpListRef = result;
            const loggedInUserId = localStorage.getItem('userId');
            if (result.data) {
                this.personalPay = result.data.filter(item => item.payerId === loggedInUserId);
                this.personalReceive = result.data.filter(item => item.receiverId === loggedInUserId);
                
                if(this.personalPay.length !== 0 || this.personalReceive.length !== 0){
                    this.personalRecordExist = true;
                } else if(this.personalPay.length === 0 || this.personalReceive.length === 0){
                    this.personalRecordExist = false;
                }
                this.settleUpList = result.data;
                if(this.settleUpList.length === 0){
                    this.transectionExist = false;
                    this.handleMoreDetails();
                }
                this.isLoading = false;
            }
            if(result.error){
                console.error('error while fetching settle up data :', result.error);
                this.isLoading = false;
            }
        }

    @wire(getPaidTransection,{ GroupId : '$groupId' })
    wiredPaiTransDetails(result) {
        this.paidTransectionListRef = result;
        if (result.data) {
            this.paidTransectionList = result.data;
            this.paidTransectionListExist = true;
        }
        if(result.error){
            console.error('error while fetching Paid transection up data :', result.error);
        }
    }

    @wire(getUserDetails, {userId : localStorage.getItem('userId')})
    userDetails(result){
        if(result.data){
            this.userProPic = result.data?.Profile_Picture__c;
        }
    }

    handleMoreDetails(){
        this.buttonTitle = this.buttonTitle === 'All Transection ⬇️' ? 'My Transection ⬆️' : 'All Transection ⬇️';
        this.personal = !this.personal;
    }

    showModal(){
        const modal = this.template.querySelector('.modal');
        modal.show();
    }

    hideModal(){
        const modal = this.template.querySelector('.modal');
        modal.close();
    }

    UPIid = '';
    modalAmount = 0;
    modalPerson = '';
    modalReceiverId = '';

    getPaymentInformation(event){
        this.dollarLoader = true;
        this.paidObj.id = event.currentTarget.dataset.id;
        this.paidObj.payerName = event.currentTarget.dataset.payername;
        this.paidObj.payerId = event.currentTarget.dataset.payerid;
        this.paidObj.receiverName = event.currentTarget.dataset.receivername;
        this.paidObj.receiverId = event.currentTarget.dataset.receiverid;
        this.paidObj.amount = Number(event.currentTarget.dataset.amount);

        this.modalAmount = this.paidObj.amount;
        this.modalPerson = this.paidObj.receiverName;
        this.modalReceiverId = this.paidObj.receiverId;
        this.getUpiId();
    }

    getUpiId() {
        getUpiId({ UserId: this.modalReceiverId })
            .then(data => {
                this.UPIid = data;
                this.dollarLoader = false;
                this.showModal();
            })
            .catch(error => {
                this.dollarLoader = false;
                console.error('Error fetching user upi id :', error);
            });
    }

    confirmPayment(){

        if(this.UPIid){
            const UPILink =`upi://pay?pa=${this.UPIid}&pn=${this.modalPerson}&am=${this.modalAmount}&cu=INR`
            window.location.href = UPILink;
        } else {
            this.dollarLoader = true;
        }

        createPaidTransection({
            GroupId : this.groupId,
            PaidList : this.paidObj
        })
        .then(() => {
            this.hideModal();
            refreshApex(this.settleUpListRef);
            refreshApex(this.paidTransectionListRef);
            this.dollarLoader = false;
        })
        .catch(error => {
            console.error('Error creating payment record :', error);
            this.dollarLoader = false;
        });
    }

    showTransectionPage(){
        this.transectionExist = true;
    }
}