public class UserGroupHandler {
    public static void countGroupMembers(Id GroupId){
        AggregateResult results = [Select Count(Id) From User_Group__c Where Group__c = :GroupId];
        Integer userGroupCount = (Integer)results.get('expr0');
        
        Group__c usrGrp = [Select Id From Group__c Where Id = :GroupId];
        usrGrp.Total_Members__c = userGroupCount;
        update usrGrp;
        
    }
}