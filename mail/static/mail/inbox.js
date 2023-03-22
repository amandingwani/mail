window.onpopstate = function(event) {
  // console.log(history.state)
  if (event.state) {
    if (event.state.mailbox) {
      // console.log(event.state.mailbox);
      if(event.state.mailbox === 'compose') {
        compose_email();
      }
      else {
        load_mailbox(event.state.mailbox);
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => push_state_load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => push_state_load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => push_state_load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', push_state_compose_email);

  // Event listener for archive button
  document.querySelector('#email-view-archive').addEventListener('click', archive_email);

  // Event listener for reply button
  document.querySelector('#email-view-reply').addEventListener('click', reply_email);

  // send mail on click
  document.querySelector('#compose-form').addEventListener('submit', event => send_email(event))

  // By default, load the inbox
  push_state_load_mailbox('inbox');
});

function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function push_state_compose_email() {
  // add to browser history
  history.pushState({mailbox: "compose"}, '');
  // console.log(history.state)

  compose_email();
}

function push_state_load_mailbox(mailbox) {
  // add to browser history
  history.pushState({mailbox: mailbox}, '');
  // console.log(history.state)

  load_mailbox(mailbox);
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // make api call
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    if (emails.error) {
      const element = document.createElement('div');
      element.classList.add('error');
      element.innerHTML = emails.error;
      document.getElementById('emails-view').append(element);
    }
    else {
      emails.forEach(element => {
        // create an email-list-email div element
        const e = document.createElement('div');
        e.classList.add('emails-view-email');
        e.id = element.id;
        e.addEventListener('click', function() {
          view_email(e.id)
        });
        document.getElementById('emails-view').append(e);

        emailElement = document.getElementById(element.id);
        // now inside the above div, add sender, subject and timestamp
        // sender
        const sender = document.createElement('strong');
        sender.classList.add('sender');
        if (mailbox !== 'sent'){
          sender.innerHTML = element.sender;
        }
        else {
          sender.innerHTML = `To: ${element.recipients}`;
        }
        emailElement.append(sender);

        // subject
        const subject = document.createElement('span');
        subject.classList.add('subject');
        subject.innerHTML = element.subject;
        emailElement.append(subject);

        // timestamp
        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        timestamp.innerHTML = element.timestamp;
        emailElement.append(timestamp);

        if (element.read) {
          emailElement.style.backgroundColor = 'grey';
          timestamp.style.color = 'lightgrey';
        }
      });
    }
  })
  .catch(error => console.log("Error: ", error));
}

function send_email(event) {
  // prevent form from submitting
  event.preventDefault();

  let recipients = document.getElementById('compose-recipients').value;
  let subject = document.getElementById('compose-subject').value;
  let body = document.getElementById('compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    // // Print result
    // console.log(result);
    if (result.error) {
      document.querySelector('.error').innerHTML = result.error;
    }
    else {
      // load the user’s sent mailbox.
      load_mailbox('sent');
    }
  })
  .catch(error => console.log("Error: ", error));
}

function view_email(id) {
  // Show the email and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // make api call
  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
    if (email.error) {
      const element = document.createElement('div');
      element.classList.add('error');
      element.innerHTML = email.error;
      document.getElementById('email-view').append(element);
    }
    else {
      from = document.getElementById('email-view-from');
      to = document.getElementById('email-view-to');
      subject = document.getElementById('email-view-subject');
      timestamp = document.getElementById('email-view-timestamp');
      body = document.getElementById('email-view-body');
      archiveButton = document.getElementById('email-view-archive');
      replyButton = document.querySelector('#email-view-reply');

      from.innerHTML = email.sender;
      to.innerHTML = email.recipients;
      subject.innerHTML = email.subject;
      timestamp.innerHTML = email.timestamp;
      body.innerHTML = email.body;

      archiveButton.innerHTML = (email.archived) ? 'Unarchive Email' : 'Archive Email';
      archiveButton.dataset.id = email.id;
      archiveButton.dataset.value = !email.archived;

      replyButton.dataset.recipient = email.sender;
      replyButton.dataset.subject = email.subject;
      replyButton.dataset.body = email.body;
      replyButton.dataset.timestamp = email.timestamp;

      // update the email as read, if not already
      if (!email.read) {
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        })
        .catch(error => console.log("Error: ", error));
      }
    }
  })
  .catch(error => console.log("Error: ", error));
}

// update archive property by value (true/false)
function archive_email() {
  archiveButton = document.getElementById('email-view-archive');
  console.log(`archive_email triggered with button data: ${archiveButton.dataset.id}, ${archiveButton.dataset.value}`)
  // update the email as archived
  fetch(`/emails/${archiveButton.dataset.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: (archiveButton.dataset.value === 'true') ? true : false
    })
  })
  .then(
    () => load_mailbox('inbox')
  )
  .catch(error => console.log("Error: ", error));
}

function reply_email() {
  compose_email();

  replyButton = document.querySelector('#email-view-reply');
  
  // Prefill composition fields
  document.querySelector('#compose-recipients').value = replyButton.dataset.recipient;
  let subject = replyButton.dataset.subject;
  if (subject.substring(0,4) !== "Re: ") {
    subject = "Re: " + subject;
  }
  document.querySelector('#compose-subject').value = subject;
  let body = `\nOn ${replyButton.dataset.timestamp} ${replyButton.dataset.recipient} wrote:\n\t`
  body += replyButton.dataset.body;
  document.querySelector('#compose-body').value = body;
}