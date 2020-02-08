let GithubFilesystem = require('./github-filesystem')
let html = require('nanohtml/lib/server')
const debug = true

let repository = new GithubFilesystem({
  user: 'Bluebie',
  repo: 'test-git-data-cloudflare-worker-api',
  branch: 'master',
  token: require('./github-token.json').token
})

addEventListener('fetch', event => {
  console.log("recieved request")
  if (debug) {
    event.respondWith(debugRequest(event.request))
  } else {
    event.respondWith(handleRequest(event.request))
  }
})

// debug mode wrapper:
async function debugRequest(request) {
  try {
    return await handleRequest(request)
  } catch (err) {
    // Return the error stack as the response
    return new Response(err.stack || err)
  }
}

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  let url = new URL(request.url)
  console.log(`handling request for ${url}`)

  if (url.pathname == "/update" && request.method == "POST") {
    let formData = await request.formData()
    console.log(`update request, set message to ${formData.get("text")}`)
    let file = await repository.updateFile({
      path: "message.txt", sha: formData.get("sha")
    }, formData.get("text"), `Set message: ${formData.get("text")}`)

    return new Response(JSON.stringify({ success: true, sha: file.sha }), { headers: { 'content-type': 'application/json' } })

  } else if (url.pathname == "/") {
    console.log(`read request, calling repo.readFile`)
    let messageText = await repository.readFile("message.txt")
    console.log(`readFile complete, result:`, messageText)
    return new Response(html`<!DOCTYPE html>
    <html><head><title>Test Page</title>
    </head><body>
      <h1>Testing using GitHub as a storage backend to Cloudflare workers</h1>
      <p>Here is a message you can edit:</p>
      <blockquote><pre id="message-text">${messageText.toString()}</pre></blockquote>
      <p>To set the message to something else, fill out this form:</p>
      <form method="POST" action="/update" id="update-form">
        <input type="hidden" name="sha" value="${messageText.sha}">
        <input type="text" name="text" value="">
        <input type="submit" name="button" value="Update Text">
      </form>
      <script>
        document.getElementById('update-form').onsubmit = (event)=> {
          event.preventDefault()
          let formData = new FormData(document.getElementById('update-form'))
          fetch("/update", {
            method: 'POST', body: formData
          }).then(result => {
            return result.json()
          }).then(response => {
            if (response.success) {
              document.getElementById('message-text').textContent = formData.get("text")
              document.querySelector('input[name=sha]').value = response.sha
            } else {
              alert("Failed to update server side")
            }
          })
        }
      </script>
    </body></html>`, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } else {
    return new Response(`Unknown url pathname: "${url.pathname}"`, 
    { headers: { "content-type": "text/plain; charset=utf-8" } })
  }
}
