function registerOnClickHandlers(){


    const addApp = document.getElementById("add-application");
    addApp.onclick = (event)=>{
        const newVal = addApp.value;
        if(newVal != ""){
            addRowToApplicationTable(newVal, "todo", "todo");
            addApp.value = "";
        }
    };

    const newApp = document.getElementById("new-application");
    newApp.onclick = (event)=>{
        event.preventDefault();
        event.stopPropagation();
        addRowToApplicationTable(
            document.getElementById("app-name").value,
            document.getElementById("app-type").value,
            document.getElementById("app-rooms").value
        );
    };
}

function addRowToApplicationTable(name, type, rooms){
    const appTable = document.getElementById("applications");

    let isAlreadyThere = false;
    appTable.childNodes.forEach((tr)=>{
        if(tr.childNodes[0].innerHTML == name){
            isAlreadyThere = true;
        }
    });

    if(!isAlreadyThere){
        const newRow = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.innerHTML = name;
        newRow.appendChild(nameCell);

        const typeCell = document.createElement("td");
        typeCell.innerHTML = type;
        newRow.appendChild(typeCell);

        const roomsCell = document.createElement("td");
        roomsCell.innerHTML = rooms;
        newRow.appendChild(roomsCell);

        appTable.appendChild(newRow);
    }
}


document.addEventListener("DOMContentLoaded", registerOnClickHandlers)
