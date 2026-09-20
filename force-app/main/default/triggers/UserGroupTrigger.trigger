trigger UserGroupTrigger on User_Group__c (after insert,after update,after delete) {
	
    if(trigger.isAfter && (trigger.isInsert || trigger.isUpdate)){
        UserGroupHandler.countGroupMembers(Trigger.new[0].Group__c);
    }
    if(trigger.isAfter && trigger.isDelete){
        UserGroupHandler.countGroupMembers(Trigger.old[0].Group__c);
    }
}