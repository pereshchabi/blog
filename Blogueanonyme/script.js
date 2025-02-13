// Clés Supabase
const SUPABASE_URL = config.SUPABASE_URL_env; // URL Supabase
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY_env; // Anon Key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonction pour uploader une image dans Supabase Storage
async function uploadImage(file) {
    const fileName = `${Date.now()}-${file.name}`; // Nom unique pour l'image
    const { data, error } = await supabaseClient.storage
        .from("post_images") // Assurez-vous que ce bucket existe dans Supabase
        .upload(fileName, file);

    if (error) {
        console.error("❌ Erreur d'upload :", error);
        return null;
    }
    // Retourne l'URL de l'image une fois uploadée
    return `${SUPABASE_URL}/storage/v1/object/public/post_images/${fileName}`;
}

// Fonction qui s'exécute lors de l'envoi du formulaire
document.getElementById("formPublication").addEventListener("submit", async function (event) {
    event.preventDefault(); // Empêche l'envoi traditionnel du formulaire
    
    // Récupération des données du formulaire
    const content = document.getElementById("messageContent").value;
    let imageUrl = null;

    // Si une image est présente, on l'upload
    
    

    // Valeur par défaut si le contenu du message est vide
    const messageData = {
        content: content || "", // Valeur par défaut pour le contenu
        image_url: imageUrl || "", // Si aucune image n'est uploadée, image_url est une chaîne vide
        author: "******", // L'auteur par défaut
        created_at: new Date(), // Date et heure de la création du message
        likes: 0, // Valeur par défaut pour les likes
        dislikes: 0, // Valeur par défaut pour les dislikes
        comments_count: 0 // initialiser à zéro
    };
    

    // Afficher les données avant d'envoyer la requête
    console.log("Données envoyées à Supabase : ", messageData);

    // Insertion des données dans Supabase
    const { error } = await supabaseClient.from("messages").insert([messageData]);

    if (error) {
        console.error("❌ Erreur d'insertion :", error);
    } else {
        console.log("✅ Message envoyé !");
        // Vider le champ de texte après la soumission
        document.getElementById("messageContent").value = "";

        // Ajouter une animation ou un retour visuel après la soumission
        document.getElementById("messageContent").classList.add("submitted");
        loadMessages()
    }
});
// 👍 Fonction pour ajouter un like
async function likePost(postId) {
    const { data, error } = await supabaseClient.rpc("increment", {
        column_name: "likes",
        amount: 1,
        post_id: postId,
    });

    if (error) {
        console.error("❌ Erreur lors de l'ajout d'un like :", error);
    } else {
        console.log("✅ Like ajouté !");
        loadMessages(); // Recharge les messages
    }
}

// 👎 Fonction pour ajouter un dislike
async function dislikePost(postId) {
    const { data, error } = await supabaseClient.rpc("increment", {
        column_name: "dislikes",
        amount: 1,
        post_id: postId,
    });

    if (error) {
        console.error("❌ Erreur lors de l'ajout d'un dislike :", error);
    } else {
        console.log("✅ Dislike ajouté !");
        loadMessages(); // Recharge les messages
    }
}

// 💬 Fonction pour ajouter un commentaire
async function addComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    const commentText = commentInput.value.trim();

    if (!commentText) {
        alert("Le commentaire ne peut pas être vide !");
        return;
    }

    const { error } = await supabaseClient.from("comments").insert([
        { message_id: postId, author: "👤", content: commentText }
    ]);

    if (error) {
        console.error("❌ Erreur lors de l'ajout du commentaire :", error);
    } else {
        console.log("✅ Commentaire ajouté !");
        commentInput.value = ""; // Vider l'input
        loadMessages(); // Recharge les messages
    }
}

//  Charger les messages et afficher les commentaires
async function loadMessages() {
    // Récupère les messages avec les commentaires associés
    const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("*, comments(*)");

    if (error) {
        console.error("❌ Erreur lors du chargement des messages :", error);
        return;
    }

    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";

    // Filtrer les messages vides avant de les afficher
    const filteredMessages = messages.filter(msg => msg.content.trim() !== "");

    // Calculer la note combinée (likes + commentaires) pour chaque message
    filteredMessages.forEach((msg) => {
        msg.combined_score = 0.3*(msg.likes || 0) + 0.7*(msg.comments.length || 0); // Somme des likes et commentaires
    });

    //  Trier les messages par la note combinée (en ordre décroissant)
    filteredMessages.sort((a, b) => b.combined_score - a.combined_score);

    // Affichage des messages triés
    filteredMessages.forEach((msg) => {
        const messageCard = document.createElement("div");
        messageCard.classList.add("message-card");

        const date = new Date(msg.created_at).toLocaleString();

        //  Affichage du message et des boutons d'interaction
        messageCard.innerHTML = `
            <div class="message-header">
                <strong>${msg.author || "*****"}</strong> • <span>${date}</span>
            </div>
            ${msg.image_url ? `<img src="${msg.image_url}" class="message-image" alt="Image de la publication">` : ""}
            <p>${msg.content}</p>
            <div class="message-footer">
                <button onclick="likePost(${msg.id})">👍 ${msg.likes || 0}</button>
                <button onclick="dislikePost(${msg.id})">👎 ${msg.dislikes || 0}</button>
                <span>💬 ${msg.comments.length || 0} commentaires</span>
            </div>

            <!-- ✅ Zone de commentaire avec un bouton -->
            <div class="comments-section">
                <input type="text" id="commentInput-${msg.id}" placeholder="Ajouter un commentaire...">
                <button onclick="addComment(${msg.id})">💬 Ajouter un commentaire</button>
                <div class="comments-list">
                    ${msg.comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.author}</strong>: ${comment.content} <br>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.appendChild(messageCard);
    });
}

loadMessages(); // Charger les messages au démarrage
