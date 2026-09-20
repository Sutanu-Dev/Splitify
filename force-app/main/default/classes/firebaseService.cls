public without sharing class firebaseService {
    
    @AuraEnabled
    public static void createGroupExpenseRecord(String GroupId, String SharedWithOption, String MemberOption, String Title, Integer Amount, String PaidByUserId, String PaidByUserName,String ShareType, List<Map<String, String>> SharedUsers) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        String uniqueId = generateUniqueId();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses/'+uniqueId+'.json';
        request.setEndpoint(url);
        request.setMethod('PATCH');
        request.setHeader('Content-Type', 'application/json');
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('title', Title);
        data.put('amount', Amount);
        data.put('createdDate', date.today());
        data.put('paidByUserId', PaidByUserId);
        data.put('paidByUserName', PaidByUserName);
        data.put('sharedWith', SharedUsers);
        data.put('id',uniqueId);
        data.put('memberOption', MemberOption);
        data.put('sharedWithOption', SharedWithOption);
        data.put('shareType',ShareType);
        
        String jsonData = JSON.serialize(data);
        request.setBody(jsonData);
        
        try {
            HttpResponse response = http.send(request);
        } catch (Exception e) {
            System.debug('Error occurred while sending data to Firebase: ' + e.getMessage());
        }    
    }
    
    @AuraEnabled
    public static void updateGroupExpenseRecord(String GroupId, String ExpenseId, String SharedWithOption, String MemberOption,String PaidByUserId, String PaidByUserName, String Title,Integer Amount,String ShareType, List<Map<String, String>> SharedUsers){
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses/'+ExpenseId+'.json';
        request.setEndpoint(url);
        request.setMethod('PATCH');
        request.setHeader('Content-Type', 'application/json');
        
        Map<String, Object> data = new Map<String, Object>();
        if(Title != null && Title != ''){
            data.put('title', Title);
        }
        if(Amount != null){
            data.put('amount', Amount);
        }
        if(SharedUsers != null && !SharedUsers.isEmpty()){
            data.put('sharedWith', SharedUsers);
        }
        if(PaidByUserId != null){
            data.put('paidByUserId', PaidByUserId);
        }
        if(PaidByUserName != null){
            data.put('paidByUserName', PaidByUserName);
        }
        if(SharedWithOption != null){
            data.put('sharedWithOption', SharedWithOption);
        }
        data.put('memberOption', MemberOption);
        data.put('shareType',ShareType);
        
        String jsonData = JSON.serialize(data);
        request.setBody(jsonData);
        
        try {
            HttpResponse response = http.send(request);

            if (response.getStatusCode() == 200 || response.getStatusCode() == 201) {
                
            } else {
                System.debug('Failed to update data. Response: ' + response.getBody());
            }
        } catch (Exception e) {
            System.debug('Error occurred while updating data to Firebase: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Object fetchGroupExpenses(String GroupId) {
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses.json';
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setMethod('GET');
        req.setHeader('Content-Type', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            List<Object> expenseList = new List<Object>();
            
            Map<String, Object> resultMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if( resultMap != null && resultMap.size() > 0 ){
               expenseList = resultMap.values();
            }
            return expenseList;
        } else {
            System.debug('Error: ' + res.getStatusCode() + res.getBody());
            return res.getStatusCode() +' - '+ res.getBody();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Object getExpenseItem(String GroupId,String ExpenseId) {
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses/'+ExpenseId+'.json';
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setMethod('GET');
        req.setHeader('Content-Type', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            return res.getBody();
            
        } else {
            System.debug('Error: ' + res.getStatusCode() + res.getBody());
            return res.getStatusCode() +' - '+ res.getBody();
        }
    }
    
    @AuraEnabled
    public static void deleteExpenseItem(String GroupId,String ExpenseId) {
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses/'+ExpenseId+'.json';
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        
        req.setEndpoint(url);
        req.setMethod('DELETE');
        req.setHeader('Content-Type', 'application/json');
        
        try {
            HttpResponse response = http.send(req);
        } catch (Exception e) {
            System.debug('Error occurred while deleting expense item in Firebase: ' + e.getMessage());
        }
    }
    
    public static String generateUniqueId() {
        Long timeStamp = DateTime.now().getTime();
        Long randomNumber = Math.abs(Crypto.getRandomLong());
        return String.valueOf(timeStamp) + String.valueOf(randomNumber);
	}
    
    public static String generateShortUniqueId() {
        Long timeStamp = DateTime.now().getTime();
        Integer randomNum = Math.mod(Math.abs(Crypto.getRandomInteger()), 1000000);
        return String.valueOf(timeStamp) + String.valueOf(randomNum);
	}
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> settleUpCalc(String GroupId) {
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/expenses.json';
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setMethod('GET');
        req.setHeader('Content-Type', 'application/json');
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() == 200) {
            
            Map<String, Object> resultMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            if(resultMap == null || resultMap.isEmpty()){
                return null;
            }
            List<Object> expenseList = resultMap.values();
            
            List<Map<String, Object>> settlements = calculateSettlements(expenseList);
            List<Map<String, Object>> paidList =  getPaidTransection(GroupId);
            
            if(paidList != null && paidList.size() > 0){
                settlements = finalSettleUpCalc(settlements, paidList);
            }
            
            updateSettleUpRecords(GroupId , settlements);
            return settlements;
        } else {
            System.debug('Error: ' + res.getStatusCode() + res.getBody());
            return null;
        }
    }
    
    public static List<Map<String, Object>> finalSettleUpCalc(List<Map<String, Object>> settleUpList, List<Map<String, Object>> paidTransactions) {

    Map<String, Decimal> paidTransactionMap = new Map<String, Decimal>();
    for (Map<String, Object> paid : paidTransactions) {
        String key = paid.get('payerId') + '-' + paid.get('receiverId');
        Decimal amount = (Decimal) paid.get('amount');

        if (paidTransactionMap.containsKey(key)) {
            paidTransactionMap.put(key, paidTransactionMap.get(key) + amount);
        } else {
            paidTransactionMap.put(key, amount);
        }
    }

    List<Map<String, Object>> updatedSettleUpList = new List<Map<String, Object>>();

    for (Map<String, Object> settle : settleUpList) {
        String key = settle.get('payerId') + '-' + settle.get('receiverId');
        Decimal originalAmount = (Decimal) settle.get('amount');

        if (paidTransactionMap.containsKey(key)) {
            Decimal paidAmount = paidTransactionMap.get(key);
            Decimal newAmount = originalAmount - paidAmount;

            if (newAmount > 0) {
                settle.put('amount', newAmount);
                updatedSettleUpList.add(settle);
            }
        } else {
            updatedSettleUpList.add(settle);
        }
    }

    return updatedSettleUpList;
}

    

    public static void updateSettleUpRecords(String GroupId, List<Map<String, Object>> settleUpList){
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'.json';
        request.setEndpoint(url);
        request.setMethod('PATCH');
        request.setHeader('Content-Type', 'application/json');
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('settleUpList', settleUpList);
        
        String jsonData = JSON.serialize(data);
        request.setBody(jsonData);
        
        try {
            HttpResponse response = http.send(request);

        } catch (Exception e) {
            System.debug('Error occurred while updating data to Firebase: ' + e.getMessage());
        } 
    }

   public static List<Map<String, Object>> calculateSettlements(List<Object> expenses) {
    Map<String, Decimal> balances = new Map<String, Decimal>();
    Map<String, String> userNames = new Map<String, String>();  // Stores userId → userName mapping
    
    for (Object expenseObj : expenses) {
        Map<String, Object> expense = (Map<String, Object>) expenseObj;
        
        String paidByUserId = (String) expense.get('paidByUserId');
        String paidByUserName = (String) expense.get('paidByUserName');
        Decimal totalAmount = (Decimal) expense.get('amount');

        userNames.put(paidByUserId, paidByUserName);

        if (!balances.containsKey(paidByUserId)) {
            balances.put(paidByUserId, 0);
        }
        balances.put(paidByUserId, balances.get(paidByUserId) + totalAmount);

        List<Object> sharedWith = (List<Object>) expense.get('sharedWith');
        for (Object shareObj : sharedWith) {
            Map<String, Object> share = (Map<String, Object>) shareObj;
            String sharedUserId = (String) share.get('id');
            String sharedUserName = (String) share.get('name');
            Decimal shareAmount = Decimal.valueOf((String) share.get('amount'));

            userNames.put(sharedUserId, sharedUserName);

            if (!balances.containsKey(sharedUserId)) {
                balances.put(sharedUserId, 0);
            }
            balances.put(sharedUserId, balances.get(sharedUserId) - shareAmount);
        }
    }

    List<SettlementWrapper> creditors = new List<SettlementWrapper>();
    List<SettlementWrapper> debtors = new List<SettlementWrapper>();

    for (String userId : balances.keySet()) {
        Decimal balance = balances.get(userId);
        if (balance > 0) {
            creditors.add(new SettlementWrapper(userId, userNames.get(userId), balance));
        } else if (balance < 0) {
            debtors.add(new SettlementWrapper(userId, userNames.get(userId), balance.abs()));
        }
    }

    creditors.sort();
    debtors.sort();

    List<Map<String, Object>> settlements = new List<Map<String, Object>>();

    Integer i = 0, j = 0;
    while (i < debtors.size() && j < creditors.size()) {
        SettlementWrapper debtor = debtors[i];
        SettlementWrapper creditor = creditors[j];

        Decimal settlementAmount = Math.min(debtor.amount, creditor.amount);

        settlements.add(new Map<String, Object>{
            'id' => generateShortUniqueId(),
            'payerId' => debtor.id,
            'payerName' => debtor.name,
            'receiverId' => creditor.id,
            'receiverName' => creditor.name,
            'amount' => settlementAmount
        });

        debtor.amount -= settlementAmount;
        creditor.amount -= settlementAmount;

        if (debtor.amount == 0) i++;
        if (creditor.amount == 0) j++;
    }

    return settlements;
}


    public class SettlementWrapper implements Comparable {
        public String id;
        public String name;
        public Decimal amount;
        
        public SettlementWrapper(String id, String name, Decimal amount) {
            this.id = id;
            this.name = name;
            this.amount = amount;
        }
        
            public Integer compareTo(Object obj) {
            SettlementWrapper other = (SettlementWrapper) obj;

            if (this.amount < other.amount) {
                return -1;
            } else if (this.amount > other.amount) {
                return 1;
            }
            return 0;
        }
    
    }
    
    @AuraEnabled
    public static void createPaidTransection(String GroupId, Map<String, Object> PaidList){
        
        List<Map<String, Object>> existingPaidList = new List<Map<String, Object>>();
        List<Map<String, Object>> temEPL = getPaidTransection(GroupId);
        if(temEPL != null && temEPL.size() > 0){
            existingPaidList.addAll(temEPL);
        }
        existingPaidList.add(PaidList);
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'.json';
        request.setEndpoint(url);
        request.setMethod('PATCH');
        request.setHeader('Content-Type', 'application/json');
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('paidList', existingPaidList);
        
        String jsonData = JSON.serialize(data);
        request.setBody(jsonData);
        
        try {
            HttpResponse response = http.send(request);
            
            if (response.getStatusCode() == 200) {
                sendPaymentNotification(GroupId , (String) PaidList.get('payerName'),(String) PaidList.get('receiverName'),(String) PaidList.get('receiverId'), (Decimal) PaidList.get('amount'));
            } else {
                System.debug('HTTP request failed with status: ' + response.getStatusCode());
            }
        } catch (Exception e) {
            System.debug('Error occurred while updating data to Firebase: ' + e.getMessage());
        } 
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getPaidTransection(String GroupId){
        
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'/paidList.json';
        request.setEndpoint(url);
        request.setMethod('GET');
        request.setHeader('Content-Type', 'application/json');

        HttpResponse response = http.send(request);
        if (response.getStatusCode() == 200) {
            List<Map<String, Object>> dataList = new List<Map<String, Object>>();
            List<Object> tempList = (List<Object>) JSON.deserializeUntyped(response.getBody());
            if(tempList == null || tempList.size() == 0){
                return null;
            }
            for(Object obj :tempList){
                dataList.add((Map<String, Object>) obj);
            }
            return dataList;
        } else {
            System.debug('Error occurred while updating data to Firebase: ' + response.getBody());
            return null;
        } 
    }
    
    @future(callout=true)
    public static void sendPaymentNotification(String GroupId, String PayerName, String ReceiverName, String ReceiverId, Decimal Amount) {
    
        Group__c grp = [SELECT Name FROM Group__c WHERE Id = :GroupId];
        Account receivingUser = [SELECT Email__c FROM Account WHERE Id = :ReceiverId];
    
        String Heading = 'Splitify';
        String ContentTop = 'Hey ' + ReceiverName + '! ' + PayerName + ' just paid you in the group ';
        String ContentGroupName = grp.Name;
        String toEmail = receivingUser.Email__c;
        String subject = 'Payment Received';
    
        String mailBody = '<html><body style="font-family: Arial, sans-serif; padding: 0; margin: 0;">'
            + '<div style="max-width: 400px; width: 90%; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">'
            + '<h1 style="background-color: lightgrey; color: #333; text-align: center; padding: 16px; margin: 0; font-size: 24px;">' + Heading + '</h1>'
            + '<p style="color: #333; padding: 16px; font-size: 16px; text-align: center;">' + ContentTop 
            + '<strong style="color: blueviolet;">' + ContentGroupName + '</strong>.</p>'
            + '<div style="text-align: center; border-top: 2px solid #ddd; padding: 16px;">'
            + '<div style="font-size: 18px; font-weight: bold;">Payment to '+ReceiverName+'</div>'
            + '<div style="color: green; font-size: 22px; margin: 12px 0;">INR '+Amount+'</div>'
            + '<a href="https://splitify-dev-ed.develop.my.site.com/production/group-details?groupRecId=' + GroupId + '"'
            + ' style="display: inline-block; padding: 12px 24px; background-color: #a862ec; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">View Group</a>'
            + '</div></div></body></html>';
    
        String rawEmail = 'From: "Splitify" <sutanudebnath08@gmail.com>\r\n'
            + 'To: ' + toEmail + '\r\n'
            + 'Content-Type: text/html; charset=utf-8;\r\n'
            + 'Subject: ' + subject + '\r\n\r\n'
            + mailBody;
    
        String mbody = '{ "raw" : "' + EncodingUtil.base64Encode(Blob.valueOf(rawEmail)).replace('+', '-').replace('/', '_').replaceAll('=+', '') + '"}';
    
        HttpRequest req = new HttpRequest();
        req.setHeader('Content-Length', mbody.length() + '');
        req.setHeader('Content-Type', 'application/json');
        req.setEndpoint('callout:Gmail/gmail/v1/users/sutanudebnath08@gmail.com/messages/send');
        req.setMethod('POST');
        req.setBody(mbody);
    
        Http http = new Http();
        HttpResponse res = http.send(req);
    }
    
    @future(callout=true)
    public static void addGroupToFB(String GroupId, String GroupName, String CreatedByUserId, String GroupCurrency) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        
        String url = 'callout:FirebaseApi/groups/'+GroupId+'.json';
        request.setEndpoint(url);
        request.setMethod('PATCH');
        request.setHeader('Content-Type', 'application/json');
        
        Map<String, Object> data = new Map<String, Object>();
        data.put('id', GroupId);
        data.put('name', GroupName);
        data.put('createdByUserId', CreatedByUserId);
        data.put('createdDateTime', DateTime.now().addMinutes(330));
        data.put('groupCurrency', GroupCurrency);
        
        String jsonData = JSON.serialize(data);
        request.setBody(jsonData);
        
        try {
            HttpResponse response = http.send(request);
        } catch (Exception e) {
            System.debug('Error occurred while sending data to Firebase: ' + e.getMessage());
        }    
    }

}