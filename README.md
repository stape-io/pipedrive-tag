# Pipedrive Tag for GTM Server-Side

The **Pipedrive Tag for GTM Server-Side** allows you to create new persons and leads in Pipedrive directly from your Google Tag Manager Server container.

## Features
* **Entity Creation**: Supports creating **Persons** and **Leads**.
* **Optimistic Scenario**: Option to trigger `gtmOnSuccess()` immediately without waiting for the API response to speed up response times.
* **Consent Checks**: Built-in support for checking `ad_storage` consent before execution.
* **BigQuery Logging**: Native support for streaming request and response data to BigQuery.

## Configuration

### 1. General Settings
* **Type**: Select whether to create a **Person** or a **Lead**.
* **API Token**: Enter your Pipedrive API Personal API Key.
* **Use Optimistic Scenario**: Check to fire the tag success trigger regardless of the actual API result.

### 2. Person Configuration
* **Standard Fields**: Map specific fields for **Name**, **Email**, and **Phone**.
* **Additional Parameters**: Use the table to map custom fields (Field ID and Value) supported by the Pipedrive Persons API.

### 3. Lead Configuration
* **Title**: Required field for the lead title.
* **Association**: You must associate the lead by providing either a **Person ID** or an **Organization ID**.
* **Create new person?**: If enabled, allows you to create a new Person registry simultaneously and link it to the Lead.
    * Requires **Full Name** or a combination of **First Name** and **Last Name**.
* **Additional Parameters**: Use the table to map custom parameters for the Leads API.

### 4. Consent Settings
* **Ad Storage Consent**: Choose "Send data in case marketing consent given" to abort execution if `ad_storage` is not granted.

### 5. Logging
* **Logs Settings**: Options to log to console "Always", "Never", or during "Debug and preview".
* **BigQuery Logs**: Enable to log full event data to a BigQuery table.
    * **Project ID**: Defaults to the environment variable `GOOGLE_CLOUD_PROJECT` if left empty.
    * **Dataset ID**: Required.
    * **Table ID**: Required.

## Open Source

The **Pipedrive Tag for GTM Server Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.