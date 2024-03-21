---
title: "Status"
date: 2024-02-17
description: "Status types and descriptions."
keywords: metadata, url, sitemap
---

## Status types

* Active: Source was found.
* Missing: Source was not found.
* Redirect: URL redirects to another domain.
* Can't access: Site scraping is inaccessible (status 400/401/403/404/408/500,503). Domain manager has blocked bots in the metadata or server side or the domain doesn't exist. These domains don't have scores/grades and aren't factored into the averages.

## Status Codes

<h3 id="200">200 OK</h3>

The request succeeded. The resource has been fetched and transmitted in the message body.

<h3 id="202">202 Accepted</h3>

The request has been received but not yet acted upon. It is noncommittal, since there is no way in HTTP to later send an asynchronous response indicating the outcome of the request. It is intended for cases where another process or server handles the request, or for batch processing.

<h3 id="301">301 Moved Permanently</h3>

The URL of the requested resource has been changed permanently. The new URL is given in the response.

<h3 id="400">400 Bad Request</h3>

The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).

<h3 id="401">401 Unauthorized</h3>

Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.

<h3 id="403">403 Unauthorized</h3>

The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike `401 Unauthorized`, the client's identity is known to the server.

<h3 id="404">404 Not found</h3>

The server cannot find the requested resource. In the browser, this means the URL is not recognized. In an API, this can also mean that the endpoint is valid but the resource itself does not exist.

<h3 id="408">408 Request Timeout</h3>

This response is sent on an idle connection by some servers, even without any previous request by the client. It means that the server would like to shut down this unused connection.

<h3 id="500">500 Internal Server Error</h3>

The server has encountered a situation it does not know how to handle.

<h3 id="502">502 Bad Gateway</h3>

This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response.

<h3 id="503">503 Service Unavailable</h3>

The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded.

## Links

[HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) (MDN)