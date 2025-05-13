# 08-storage-playground
| Table of Contents |
| ---- |
| [Experiments](#experiments) |
| [Summary of the Problem](#the-problem) | 
| [What We Store](#what-exactly-do-we-store) |
| [Decision Tradeoffs](#decision-trade-offs) |
| [Summary of Requests](#summary) |
| [References (Sources)](#references) |

## Experiments
❗ **This section is skippable if you're more concerned about the proposal and research. [Jump to the next section here](#the-problem).**
### Acknowledgements 

Below, you can access some experiments I played around with to see the functionalities of things. This is purely an exploration and research for my team to merely glance at the tools we could potentially use.

Credits:
- Note that the localStorage and IndexedDB implementations are fully **LLM generated**. 
- base64 source: https://openjavascript.info/2022/10/11/how-to-save-and-retrieve-images-from-localstorage/

I take no credit for writing the code.

### Links to Experiments
If you would like `.json` files to play around with, see the `json_recipes/` folder.
- [localStorage](https://avo-ucsd.github.io/08-storage-playground/localStorage-recipes.html)
- [IndexedDB](https://avo-ucsd.github.io/08-storage-playground/indexedDB-recipes.html)
- [base64](https://avo-ucsd.github.io/08-storage-playground/localStorage-base64.html)

## The Problem
In our project app, we're going to need to have some sort of storage method for our recipes. We also need to address the **CRUD** (Create, Read, Update, Delete) aspect of the project. The heart of the problem is deciding between [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) versus [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). Both are browser storage methods, but they are different in their own ways. Below is a *summary* of *some* key differences that may be relevant to our project. Note this is *not* a comprehensive list.

| Interest Area | localStorage | IndexedDB |
| ---- | ---- | ---- |
| Storage Limit (See [2.0.0](#200-informational)) | 5MB | Varies per browser-- 1GB seems to be the *lower bound* (See [2.0.2](#200-informational) for specifics). |
| Data Supported | Limited to strings | Objects, arrays, Blobs, etc (binary data) |
| Querying | No, must be done manually | Yes, for indexed lookups and range queries | 
| API Complexity ([See 2.0.4](#200-informational)) | Synchronous | Asynchronous |

See [2.0.5](https://www.geeksforgeeks.org/difference-between-localstorage-and-indexeddb-in-javascript/) for additional detail.

## What EXACTLY do we store?
### JSON Data
As we discussed, we certainly want to work with schema.org's [Recipe scheme](https://schema.org/Recipe) (or Google's [slightly modified version](https://developers.google.com/search/docs/appearance/structured-data/recipe)). This is all in JSON. However, we do want to consider the option of users uploading a JSON file to load their own recipes. We would need **FileReader** to handle this.
- We wouldn't need to be concerned about users manually typing all of their recipes should they already have the JSON files ready. This is also something we can provide to the users if they want to download their JSON files after manually inputting information on our app.
- Utilizing existing recipe formats (Google and schema.org) allow us to fit in the ecosystem. We're not reinventing the wheel, so if the user wants to migrate to or from our app, our formats should work well together with other recipe apps.

However, we do have image data to consider... 

### Image Data
We have a couple of options:
1. Direct file path (e.g. `./assets/my_food.jpg`)
2. base64 image conversion
3. `Blob` Object

Here's a quick rundown of the pros and cons:
| Image Storing Method | Pros | Cons |
| ---- | ---- | ---- |
| **Direct file path** | - Simplest method (and the one we've worked most with in the Lab assignments) | - Not really a permanent solution. Files can be changed (e.g. location or name) or deleted.  |
|  | - Works with localStorage and IndexedDB | - [CORS policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) will complain for security reasons |
| **base64** | - Works with localStorage and IndexedDB | - Incredibly storage inefficient; blows up the original file size when converting to base64 by about 33% on average. |
|   | - Independent of original image file changing | - Necessitates FileReader |
| **`Blob`** Object | - Keeps the original image file size (storage efficient) | - Necessitates IndexedDB |
|   | - Independent of original image file changing | |

#### Approaches to Consider
While we discuss our options and/or wait for approval for these APIs, we can play around with relative file paths for now (e.g. `./assets/images/food.png`). In the JSON that we use for recipes, it might be a good approach to use an Object to wrap our image data in so that it's easily swappable. For example:

##### Initial Implementation: Relative File Paths
```json
{ 
  title: "Chocolate Chip Cookies",
  image: {
    format: "file-path",
    data: "./assets/images/my_cookies.jpg"
  }
}
```

##### Next Implementation: Blobs
```json
{ 
  title: "Chocolate Chip Cookies",
  image: {
    format: "Blob",
    data: [File or Blob object] // derived from something like <input type="file">
  }
}
```

## Decision Trade-offs
### FileReader
##### 🙂 Yay
- We would fit in the recipe ecosystem. 
- User involvement (manual work) is reduced should they have JSON files ready to upload.
- File uploads are offline, so it's not adding any online dependence for our application.

##### ☹️ Nay
- Users would have to manually upload their files initially. We also have to consider the problem whether or not we want to support batch uploads. That being said, this should be a process done once as the data will be moved to storage.
- If a user's JSON data is formatted incorrectly, we should consider possibly throwing an error that the file could not be parsed.

### Image Data
#### File Paths or Blobs
- File paths are probably a fine solution to use while in the stage of developing. However, if we try to throw our HTML straight into the browser and if the app tries to access some local image file, CORS will complain. Additionally, as mentioned before, this is not a long living solution. File locations and file names can be changed.
- While, yes, we would need IndexedDB for Blobs, they would bring utility for both the user and us: 
    1) Users don't have to think about keeping their images saved in the correct location (+ for us, the programmers, we don't have to worry about error handling when a file goes missing)
    2) We keep images "as-is" in the database.
   

#### base64
😬 My take: not a realistic consideration-- the overhead from base64 isn't really worth it for both localStorage and IndexedDB. I would not consider it.

### Storage
#### localStorage
##### 🙂 Yay
- We stick with what we were exposed to in the labs, so we wouldn't have to learn anything new. This will save us on time (time to get approval, time to learn it, time to debug it, etc). If we want simple, this is the simplest solution for our app. A lot less room for error.
- If we end up deciding that we don't need images along with the user recipes, then we won't need the complexity of IndexedDB. Text data is pretty small anyway... a question to consider is: how many users would actually attach an image along with their recipe?
- Synchronous behavior means predictable behavior. It makes debugging easier for us.

##### ☹️ Nay
- If we're thinking about the longevity of our app, then there may be a couple of issues:
  - We only store references to the user's images (remember this is an offline-first application, so online links are out of the question for this project). If this changes, then we *hypothetically* would need to handle "image not found" cases (I'm not saying we need to do this for our project should we stick with this, but this is moreso a concern for our project "living beyond" this SP25 quarter).
  - While we're storing text data, 5MB isn't a lot of storage in the modern age. It would work for those with a small number of recipes, yes. However, if we consider the tail end of the spectrum, there may be users out there whose cookbooks in text will exceed 5MB.
- In terms of performance, localStorage is synchronous, meaning our app "waits" for its proceesses to finish before the app can continue. Probably not a big deal for our app within the quarter scope, but still something to consider if we want our project living beyond this quarter.

#### IndexedDB
##### 🙂 Yay
- The better option if we want our project to "live on" for the future. Flexible storage sizes and not having users worry about losing their image files (those will be stored in the DB) lets us not feel constrained by such edge cases.
- Querying can be an incredible tool for us to easily search, possibly filter elements, etc. We wouldn't have to manually loop to go through the entire set of our recipes as IndexedDB would efficiently use indexing for retrieval under the hood.
- IndexedDB is asynchronous, so our app can "do other stuff" while IndexedDB does its own processes... we don't have our app waiting! As mentioned under the "Nay" for localStorage, this probably isn't a night-and-day performance difference for the quarter-scope project, but it is still a consideration.

##### ☹️ Nay
- For us to store and work with image files in the database, we'll need two additional APIs. This means we have to do our duties on making sure we understand how to use all three (IndexedDB, Blob, and FileReader) appropriately.
  - This also means a *possible* timesink. With the quarter system, we don't have much time, and if we dwell too long on errors, we could end up wasting a lot of time. That being said, this isn't a guarantee-- just considering a possible "worst case scenario" outcome.
- So far from the labs, we have not covered `async` calls or `Promises`. This may be a potential learning curve for the team + a timesink. 
  - Asynchronous behavior means unpredictable behavior... it might prove to be a challenge for debugging.

## Summary
What APIs we would end up requesting:
| API | Purpose |
| ---- | ---- |
| IndexedDB | Store structured recipe and image data offline |
| Blob | Store image binary data             |
| FileReader | Read user-uploaded JSON/image files into memory |


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
- 2.0.4 [freeCodeCamp - Synchronous vs Asynchronous](https://www.freecodecamp.org/news/synchronous-vs-asynchronous-in-javascript/)
- 2.0.5 [GeeksForGeeks - localStorage vs IndexedDB Differences](https://www.geeksforgeeks.org/difference-between-localstorage-and-indexeddb-in-javascript/)