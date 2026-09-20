@RestResource(urlMapping='/fbimageproxy')
global with sharing class FacebookImageProxyController {
    @HttpGet
    global static void getImage() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        String imageUrl = req.params.get('url');
        if (String.isBlank(imageUrl)) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf('Missing image URL');
            return;
        }

        try {
            HttpRequest httpReq = new HttpRequest();
            httpReq.setEndpoint(imageUrl);
            httpReq.setMethod('GET');
            httpReq.setHeader('User-Agent', 'Salesforce');
            httpReq.setHeader('Accept', '*/*');
            httpReq.setTimeout(10000);

            Http http = new Http();
            HttpResponse httpRes = http.send(httpReq);

            if (httpRes.getStatusCode() == 200) {
                res.statusCode = 200;
                res.responseBody = httpRes.getBodyAsBlob();
                String contentType = httpRes.getHeader('Content-Type');
                res.addHeader('Content-Type', contentType != null ? contentType : 'image/jpeg');
            } else {
                res.statusCode = httpRes.getStatusCode();
                res.responseBody = Blob.valueOf('Failed to fetch image. Status: ' + httpRes.getStatusCode());
            }
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('Error: ' + e.getMessage());
        }
    }
}