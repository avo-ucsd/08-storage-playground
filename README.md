# 08-storage-playground
| Table of Contents |
| ---- |
| [Experiments](#experiments) |
| [Summary of the Problem](#the-problem) | 
| [What We Store](#what-exactly-do-we-store) |
| [References (Sources)](#references) |

## Experiments
### Acknowledgements 
Below, you can access some experiments I played around with to see the functionalities of things. This is purely an exploration and research for my team to understand the tools we could potentially use.

Credits:
- Note that the localStorage and IndexedDB implementations are fully **LLM generated**. 
- base64 source: https://openjavascript.info/2022/10/11/how-to-save-and-retrieve-images-from-localstorage/

I take no credit for writing the code.

### Links to Experiments
If you would like `.json` files to play arround with, see the `assets/` folder.
- [localStorage](https://avo-ucsd.github.io/08-storage-playground/localStorage-recipes.html)
- [IndexedDB](https://avo-ucsd.github.io/08-storage-playground/indexedDB-recipes.html)
- [base64](https://avo-ucsd.github.io/08-storage-playground/localStorage-base64.html)

## The Problem
In our project app, we're going to need to have some sort of storage method for our recipes. We also need to address the **CRUD** (Create, Read, Update, Delete) aspect of the project. The heart of the problem is deciding between [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) versus [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). Both are browser storage methods, but they are different in their own ways. Below is a *summary* of *some* key differences that may be relevant to our project. Note this is *not* a comprehensive list.

| Interest Area | localStorage | IndexedDB |
| ---- | ---- | ---- |
| Storage Limit (See [2.0.0](#200-informational)) | 5MB | Varies per browser-- 1GB seems to be the *lower bound*. (See [2.0.2](#200-informational) for specifics) |
| Data Supported | Limited to strings | Objects, arrays, Blobs, etc |
| Querying | No, must be done manually | Yes, uses SQL | 

## What EXACTLY do we store?
As we discussed, we certainly want to work with schema.org's [Recipe scheme](https://schema.org/Recipe) (or Google's [slightly modified version](https://developers.google.com/search/docs/appearance/structured-data/recipe)). This is all in JSON. However, we do have image data to consider... 

We have a couple of options:
1. Direct file path (e.g. `./assets/my_food.jpg`)
2. base64 image conversion
3. `Blob` Object

Here's a quick rundown of the pros and cons:
| Item | Pros | Cons |
| ---- | ---- | ---- |
| **Direct file path** | - Simplest method (and the one we've worked most with in the Lab assignments) | - Not really a permanent solution. Files can be changed (e.g. location or name) or deleted.  |
|  | - Works with localStorage and IndexedDB | - CORS policy will complain for security reasons |
| **base64** | - Works with localStorage and IndexedDB | - Incredibly storage inefficient (blows up the original file size when converting to base64) |
|   | - Independent of original image file changing | - Necessitates FileReader |
| **`Blob`** Object | - Keeps the original image file size (storage efficient) | - Necessitates IndexedDB and FileReader |
|  | - Independent of original image file changing | |

### Approaches to Consider
While we discuss our options and/or wait for approval for these APIs, 

## References
### 1.0.0 APIs
#### 1.1.0 Storage
- 1.1.1 [MDN - localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- 1.1.2 [MDN - IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
  - [Modern JS Tutorial - IndexedDB](https://javascript.info/indexeddb)
#### 1.2.0 Utility
- 1.2.1 [MDN - `Blob` object](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- 1.2.2 [MDN - FileReader](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
### 2.0.0 Informational
- 2.0.1 [MDN - Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#Storage_limits)
- 2.0.2 [RxDB - IndexedDB Storage Limits](https://rxdb.info/articles/indexeddb-max-storage-limit.html)
- 2.0.3 ['Dive into HTML5' book](https://s3.amazonaws.com/mislav/Dive+into+HTML5.pdf)