function addNote(){

    const title = document.getElementById("title").value;

    const note = document.getElementById("note").value;

    const notesDiv = document.getElementById("notes");

    notesDiv.innerHTML += `
    
    <div class="note-card">

        <h3>${title}</h3>

        <p>${note}</p>

    </div>
    
    `;
}