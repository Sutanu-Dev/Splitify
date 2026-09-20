public without sharing class GmailService {
	@AuraEnabled
    public static void sendEmail(String toEmail, String contentBody, String Heading) {
        HttpRequest req = new HttpRequest();
        String toAddress = toEmail;
        String fromName = 'Splitify';
        String fromEmail = 'sutanudebnath08@gmail.com'; 
        String subject = 'Email Verification';
        String ContentTop = 'Please verify your account with the following code : ';
        String mailBody = '<html><body style="font-family: Arial, sans-serif; padding: 0; margin: 0;">'
            + '<div style="max-width: 400px; width: 90%; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">'
            + '<h1 style="background-color: lightgrey; color: #333; text-align: center; padding: 16px; margin: 0; font-size: 24px;">' + Heading + '</h1>'
            + '<p style="color: #333; padding: 16px; font-size: 16px; text-align: center;">' + ContentTop 
            + '<strong style="background: #00d795; padding: 3px; line-height: 2;">' + contentBody + '</strong></p>'
            + '</div></body></html>';

        String rawEmail = 'From: "' + fromName + '" <' + fromEmail + '>\r\n' +
                          'To: ' + toAddress + '\r\n' +
                          'Content-Type: text/html; charset=utf-8;\r\n' +
                          'Subject: ' + subject + '\r\n\r\n' +
                          mailBody;
        
        String mbody = '{ "raw" : "' + EncodingUtil.base64Encode(Blob.valueOf(rawEmail)).replace('+', '-').replace('/', '_').replaceAll('=+', '') + '"}';
        
        req.setHeader('Content-Length', mbody.length() + '');
        req.setHeader('Content-Type', 'application/json');
        req.setEndpoint('callout:Gmail/gmail/v1/users/sutanudebnath08@gmail.com/messages/send');
        req.setMethod('POST');
        req.setBody(mbody);

        Http http = new Http();
        HttpResponse res = http.send(req);
    }
    
    public static void paymentReminder(String GroupId, String PayerName, String ReceiverName, String PayerId, Decimal Amount) {
    
        Group__c grp = [SELECT Name FROM Group__c WHERE Id = :GroupId];
        Account payingUser = [SELECT Email__c FROM Account WHERE Id = :PayerId];
    
        String Heading = 'Splitify';
        String ContentTop = 'Hey ' + PayerName + '! You owe ' +ReceiverName + ' in the group ';
        String ContentGroupName = grp.Name;
        String toEmail = payingUser.Email__c;
        String subject = 'Payment Reminder';
    
        String mailBody = '<html><body style="font-family: Arial, sans-serif; padding: 0; margin: 0;">'
            + '<div style="max-width: 400px; width: 90%; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">'
            + '<h1 style="background-color: lightgrey; color: #333; text-align: center; padding: 16px; margin: 0; font-size: 24px;">' + Heading + '</h1>'
            + '<p style="color: #333; padding: 16px; font-size: 16px; text-align: center;">' + ContentTop 
            + '<strong style="color: blueviolet;">' + ContentGroupName + '</strong>.</p>'
            + '<div style="text-align: center; border-top: 2px solid #ddd; padding: 16px;">'
            + '<div style="font-size: 18px; font-weight: bold;">Payment details :</div>'
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
}