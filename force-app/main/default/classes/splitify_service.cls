public without sharing class splitify_service {
    
    @AuraEnabled(cacheable=true)
    public static Account getUserDetails(Id userId){
        List<Account> userAcc = [Select Id,Name,Email__c,Profile_Picture__c,BillingCountry,Phone,Upi_Id__c From Account Where Id = :userId LIMIT 1];
        return userAcc[0];
    }
    
    @AuraEnabled
    public static void updateUserDetails(Id userId, String Name, String Email,String Country, String Phone, String ProfilePicture, String UPI){
        Account userAcc = [Select Id,Name,Email__c,Profile_Picture__c,BillingCountry,Phone,Upi_Id__c From Account Where Id = :userId];
        if(ProfilePicture == ''){
            userAcc.Name = Name;
            userAcc.Email__c = Email;
            userAcc.Phone = Phone;
            userAcc.BillingCountry = Country;
            userAcc.Upi_Id__c = UPI;
            update userAcc;
        }
        
        if(ProfilePicture != ''){
            userAcc.Profile_Picture__c = ProfilePicture;
            update userAcc;
        }
        
    }
    
	@AuraEnabled(cacheable=true)
    public static List<User_Group__c> getAllGroups(Id UserId){
        List<User_Group__c> grpListByUser = [Select Id,Group__c,Group__r.Name,Group__r.Total_Members__c,Group__r.Group_Picture__c 
                                           From User_Group__c Where Account__c = :UserId Order By Group__r.CreatedDate DESC];
        return grpListByUser;
    }
    
    @AuraEnabled(cacheable=true)
    public static Group__c getGroupDetails(Id GroupId){
        Group__c grp = [Select Id,Name,Group_Picture__c,Created_By__c,Album_Id__c,
                        (Select Account__r.Name,Account__r.Profile_Picture__c FROM User_Groups__r) 
                        From Group__c Where Id = :GroupId];
    	return grp;
    }
    
    @AuraEnabled
    public static void updateGroupDetails(Id GroupId, String Name, String GroupCover){
        Group__c grp = [Select Id,Name,Group_Picture__c From Group__c Where Id = :GroupId];
        if(GroupCover == ''){
            grp.Name = Name;
            update grp;
        }
        
        if(Name == ''){
            grp.Group_Picture__c = GroupCover;
            update grp;  
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Account> getAllUsers(){
        List<Account> userList = [Select Id,Name,Profile_Picture__c From Account];
        return userList;
    }
    
    @AuraEnabled
    public static void createGroup(String GroupName, Id CreatedByUser, String GroupCurrency){
        Group__c newGroup = new Group__c();
        newGroup.Name = GroupName;
        newGroup.Created_By__c = CreatedByUser;
        newGroup.Currency__c = GroupCurrency;
        insert newGroup;
        
        User_Group__c groupUser = new User_Group__c();
        groupUser.Account__c = CreatedByUser;
        groupUser.Group__c = newGroup.Id;
        insert groupUser;
        
        firebaseService.addGroupToFB(newGroup.Id, GroupName, CreatedByUser, GroupCurrency);
    }
    
    @AuraEnabled
    public static void removeGroupUser(Id GroupId, Id UserId){
        User_Group__c userGrpRec = [Select Id From User_Group__c Where Group__c = :GroupId AND Account__c = :UserId LIMIT 1];
        delete userGrpRec;
    }
    
    @AuraEnabled
    public static void deleteGroup(Id GroupId){
        Group__c grp = [Select Id From Group__c Where Id = :GroupId];
        delete grp;
    }
    
    @AuraEnabled
    public static void updateGroupMembers(Id GroupId, List<String> UserIds){
        if(GroupId == null && UserIds.isEmpty()){
            return;
        }
        List<User_Group__c> usrGrplist = [ Select Id,Account__c 
                                            From User_Group__c 
                                            Where Group__c = :GroupId AND Account__c IN :UserIds ];
        
        delete usrGrplist;        
    }
    
    @AuraEnabled(cacheable=true)
    public static List<User_Group__c> fetchGroupMembers(Id GroupId){
        List<User_Group__c> memberList = [Select Account__r.Name,Account__r.Profile_Picture__c 
                                            FROM User_Group__c 
                                            Where Group__c = :GroupId];
        return memberList;
    }
    
    @AuraEnabled(cacheable=true)
    public static String login(String Email, String Password){
        Account userAcc = [SELECT Id,Password__c FROM Account WHERE Email__c = :Email];
        if(userAcc != null){
            String encryptedPassword = getCryptoEncryption(Password);
            if(encryptedPassword == userAcc.Password__c){
                return userAcc.Id;
            }
            return 'error';
        }
        
        return 'error';
    }
    
    @AuraEnabled
    public static String signUp(String Fullname,String Email, String Password){
        Account userAcc = new Account();
        userAcc.Name = Fullname;
        userAcc.Email__c = Email;
        userAcc.BillingCountry = 'India';
        userAcc.Password__c = getCryptoEncryption(Password);
        Insert userAcc;
        return userAcc.Id;
    }
    
    @AuraEnabled
    public static String duplicateEmailVerification(String Email){
        try {
            Account userAcc = [SELECT Id FROM Account WHERE Email__c = :Email];
            if(userAcc != null){
                return 'email exist';
            }
            
            return 'success';
        } catch(exception e){
            return 'success';
        }
    }
    
    @AuraEnabled
    public static String forgotPasswordHandler(String Email, String Password){
        Account userAcc = [SELECT Id,Password__c FROM Account WHERE Email__c = :Email];
        if(Password == '' && userAcc != null){
            return 'true';
        }
        userAcc.Password__c = getCryptoEncryption(Password);
        update userAcc;
        return userAcc.Id;
    }
    
    @AuraEnabled
    public static void addToGroup(String GroupId, String UserId){
        List<User_Group__c> existingRecords = [Select Id From User_Group__c Where Account__c = :UserId AND Group__c = :GroupId LIMIT 1];
        if(!existingRecords.isEmpty()){
            return;
        }
        User_Group__c uc = new User_Group__c();
        uc.Account__c = UserId;
        uc.Group__c = GroupId;
        
        insert uc;
    }
    
    public static String getCryptoEncryption(String Data){
        Blob hash = Crypto.generateDigest('SHA-256',Blob.valueOf(Data));
        String encryptedString = EncodingUtil.convertToHex(hash);
        return encryptedString;
    }
    
    @AuraEnabled(cacheable=true)
    public static String getUpiId(String UserId){
        List<Account> Usr = [Select Upi_Id__c From Account Where Id = :UserId Limit 1];
        return Usr[0].Upi_Id__c;
    }
    
    @AuraEnabled(cacheable=true)
public static List<String> getAlbumPhotos(String AlbumId) {
    if (String.isBlank(AlbumId)) {
        return new List<String>{'no album id'};
    }

    String accessToken = 'EAAX8mZBfQi94BO11FbIj8gGWOkdMG17c30SqKQVTgp1lgCWCVy4EliZBFAG6n9CWZAdhIwfy4AGmku2HNyCeenAPHKCgFrAbp1BQovXbJsjsFwqtHmuic8XMr1NGt8es22M0hnZC3n9QXhbqzyKSaEczCmmuHGW5egF9qSyV9nFQxtSju3ZAOb7VRZBZA6clyiut6PcrcrXBxsm2Py0';
    String baseUrl = 'https://graph.facebook.com/v22.0/' + AlbumId + '/photos?fields=images&limit=100&access_token=' + accessToken;
    List<String> photoUrls = new List<String>();
    
    String nextPageUrl = baseUrl;

    Http http = new Http();

    while (!String.isBlank(nextPageUrl)) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(nextPageUrl);
        req.setMethod('GET');
        req.setTimeout(10000);

        HttpResponse res = http.send(req);
        if (res.getStatusCode() == 200) {
            Map<String, Object> response = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            List<Object> photos = (List<Object>) response.get('data');

            for (Object photoObj : photos) {
                Map<String, Object> photoMap = (Map<String, Object>) photoObj;
                List<Object> images = (List<Object>) photoMap.get('images');
                if (!images.isEmpty()) {
                    Map<String, Object> bestImage = (Map<String, Object>) images[0];
                    photoUrls.add((String) bestImage.get('source'));
                }
            }

            // Get next page URL if available
            if (response.containsKey('paging')) {
                Map<String, Object> paging = (Map<String, Object>) response.get('paging');
                nextPageUrl = (paging.containsKey('next')) ? (String) paging.get('next') : null;
            } else {
                nextPageUrl = null;
            }

        } else {
            break; // stop fetching if request fails
        }
    }

    return photoUrls;
}

}