trigger AccountHandlerTrigger on Account (after insert, after update) {
    if(trigger.isAfter && (trigger.isInsert || trigger.isUpdate)){
        AccountHandlerClass.updateUserInitials(trigger.new[0]);
    }
}