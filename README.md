A toy cloudflare worker webapp which allows users to edit the text contents of a file in this repository

Cloudflare Workers are a serverless way to build http webapps, and their free tier doesn't come with any data storage backend. I'm particularly interested in building open webapps for collecting and organising information. Setting up and administrating a wiki is a pain though, and building out complex software to handle it is a hassle.

In my dream world, we could all use tech like Beaker Browser and Dat to build distributed websites we could host at home, but until then, something that is free and open, that anyone can deploy and use without a credit card, is pretty cool.

So, how's it work? This is just a very simple prototype, where I embed my git token (gross and dangerous!) in the source code of a Cloudflare Worker. The worker then uses github's v3 api to restfully load and update the message.txt file in this very repository when anonymous users type a message in.

The github-filesystem.js file provides a very minimal interface to list directories, and read, update, or delete files. Github imposes rate limits, so it's a fairly limited way to handle it. It could be improved by using regular github raw links to load file contents instead of doing reads through the API.

## Limitations

* GitHub's rest api doesn't provide any way to "watch" for events, and I can't think of a way to create anything like a push system, so building live interactive apps would require a lot of polling, and aren't really feasible.
* Workers have very limited CPU time. Typically around 10ms on a free plan or 50ms on a paid ($5/mo) plan. This severely limits how much server side processing you can do. You couldn't, for example, transcode a video server side. There are transcode as a service APIs you could plug in to, but they aren't free. You could also use emscriptened x264 to encode client side in a consistent way in browser, if you're happy requiring modern javascript, but validating the input becomes a hassle, and if you want something like HLS/Dash segmenting and multiple quality levels it gets way more complicated quickly.
* While you technically could make something like an analytics system, it'd really suck for that. A versioned filesystem is a terrible way to store frequently written aggregate data like that.

## What would this be good for?

* Something like a wiki, or a forum. The kinds of content that are loaded on demand and can be easily represented as nice structured text work well
* You get all the versioning benefits of git for free, so if someone trashes your site you can revert their commits easily
* It would be easy to mod this to correctly attribute updates to authenticated users, so they wouldn't all look like they come from your account
* If your aim includes building an open dataset, it's super nice to stick your data in a git repo with a nice web interface everyone understands, so they can easily clone it and do other stuff with the dataset

## Possible improvements

* You could build a static site, and serve it through a CloudFlare Worker, and use client side javascript to read files as needed directly off github's free website hosting. Then, when you need to do updates or store information, the worker could intercept those calls and route them to some ajax handlers instead that write to the repo to update the website. This way, anyone could clone the repo and have a full working read only copy of the website, and you'd automatically avoid using up github api ratelimits when just doing reads, and if CloudFlare's Workers fail, you can set them to failover in to a simple CDN mode where it would proxy through to the static site on exceptions or during any possible downtime or system faults.
* You could use GitHub accounts as auth in an interactive webapp, and then use user's own github accounts to store their data - like profile and content contributions, which would get you seperate rate limits for each user, which could improve scaling a lot, and give users direct access to their data they generate, in a similar way to the Beaker Browser / Dat model of distributed webapps, just, without being distributed, at all.
