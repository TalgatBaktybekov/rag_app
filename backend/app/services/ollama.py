from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from ..db.crud import get_messages_by_conversation, get_document_selection_ids
from ..services.document_ingest import retrieve_relevant_chunks
import logging
import os

logger = logging.getLogger(__name__)

def get_ollama_llm(model="gemma3"):
    """Get Ollama LLM with proper base URL from environment"""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    return Ollama(model=model, base_url=base_url)

class SimpleChatHistory:
    def __init__(self, messages):
        self.messages = messages

def build_langchain_agent(db, user_id, conv_id, question=None, needs_context=True):
    # Add debug logging
    logger.info(f"Building langchain agent for conversation {conv_id}, user {user_id}, needs_context={needs_context}")
    
    # 1. Get chat history from your DB
    history = get_messages_by_conversation(db, user_id, conv_id)
    lc_history = []
    for msg in history:
        if msg.role == "user":
            lc_history.append({"role": "user", "content": msg.content})
        else:
            lc_history.append({"role": "ai", "content": msg.content})

    # 2. Check if conversation has selected documents
    selected_doc_ids = get_document_selection_ids(db, conv_id)
    logger.info(f"Selected document IDs: {selected_doc_ids}")
    
    # 3. Retrieve relevant context (RAG) only if needed
    context_chunks = []
    if question and needs_context:
        # Use selected documents if available, otherwise use user-accessible docs
        if selected_doc_ids:
            logger.info(f"Retrieving chunks for {len(selected_doc_ids)} selected documents")
            context_chunks = retrieve_relevant_chunks(
                query=question, 
                k=8,  # Increased from 6 to get more context
                document_ids=selected_doc_ids,
                use_mmr=True,  # Use Maximal Marginal Relevance for better diversity
                fetch_k=25,    # Get 25 initial candidates before selecting diverse subset
                search_type="advanced_ensemble"  # Use improved search strategy
            )
        else:
            # Fallback to user-accessible documents
            logger.info(f"No selected documents, retrieving from user-accessible documents")
            context_chunks = retrieve_relevant_chunks(
                query=question, 
                k=8,
                user_id=user_id,
                use_mmr=True,
                fetch_k=25,
                search_type="advanced_ensemble"
            )

    
    # Add contextual separator between chunks for better readability
    context_text = ""
    if context_chunks:
        context_segments = []
        for i, chunk in enumerate(context_chunks):
            source = chunk.metadata.get('source', 'Unknown')
            segment = f"[Document: {source}]\n{chunk.page_content}"
            context_segments.append(segment)
        
        context_text = "\n\n---\n\n".join(context_segments)
    
    logger.info(f"Total context length: {len(context_text)} characters")

    # Format context with reference numbers
    context_segments_with_refs = []
    for i, chunk in enumerate(context_chunks):
        source = chunk.metadata.get('source', 'Unknown')
        page = chunk.metadata.get('page', 0)
        ref_id = i + 1  # Reference ID starting from 1
        
        segment = f"[Reference {ref_id} - Document: {source}, Page: {page+1}]\n{chunk.page_content}"
        context_segments_with_refs.append(segment)
    
    # Join all context segments with separators
    context_with_refs = "\n\n---\n\n".join(context_segments_with_refs)
    
    # 3. Build enhanced prompt template with context
    if context_chunks and needs_context:
        # When we have context, include reference instructions
        system_prompt = (
            "IMPORTANT INSTRUCTIONS FOR REFERENCES:\n"
            "1. When you use information from the provided context, include the reference number in square brackets at the end of the relevant sentence or paragraph. Example: 'The data shows a 25% increase in efficiency [3].'\n"
            "2. ALWAYS use simple number references [X] in your response, where X is the reference number. NEVER use any expanded format in your response.\n"
            "3. Place the reference immediately after the specific information it supports.\n"
            "4. It's okay to cite multiple references for a single statement if the information comes from multiple sources, like [1, 2] or [1][2].\n"
            "5. Only use references for information that actually comes from the context provided.\n"
            "6. Always use the reference number exactly as it appears in the context to maintain consistency.\n\n"
            
            "General instructions:\n"
            "- You are a highly professional, concise, and helpful AI assistant.\n"
            "- If the provided context contains the information needed to answer the question, use it to give a precise and accurate response with proper references.\n"
            "- Pay special attention to context marked with [Reference X - Document: ...] as these are from relevant sources.\n"
            "- When asked about conclusions, summaries, or key findings, prioritize content that contains that specific information.\n"
            "- Answer in a way that is faithful to the provided context and does not introduce speculation.\n"
            "- When multiple pieces of context contain relevant information, synthesize them into a coherent answer.\n"
            "- If the provided context doesn't contain enough information to fully answer the question, you may draw on your general knowledge to supplement, but clearly distinguish between what comes from the context (with references) and what is general knowledge (without references).\n"
            "- If you do not know the answer based on your knowledge and the context, simply state that you do not know.\n"
            "- Avoid phrases like 'based on the context' or 'according to the documents provided'.\n\n"

            "Context:\n" + context_with_refs
        )
    else:
        # When no context, use a simpler prompt for general conversation
        system_prompt = (
            "You are a helpful and friendly AI assistant. Respond naturally to the user's messages. "
            "Be concise and helpful. If you're asked about specific documents or data that you don't have access to, "
            "let the user know they may need to upload relevant documents first."
        )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}")
    ])

    # 4. Set up Ollama LLM
    llm = get_ollama_llm("gemma3")

    # 5. Wrap with message history
    chain = RunnableWithMessageHistory(
        prompt | llm,
        lambda session_id: SimpleChatHistory(lc_history),
        input_messages_key="question",
        history_messages_key="chat_history",
    )
    return chain, context_chunks

# Question standardiser chain

def build_standardiser_chain():
    prompt = PromptTemplate(
        input_variables=["chat_history", "question"],
        template=(
            "Your job is to reformulate follow-up questions to be standalone by adding context from the chat history.\n\n"
            "Rules:\n"
            "1. If the question already contains enough context, return it unchanged\n"
            "2. If the question uses pronouns (it, this, that, them) or vague references (more details, explain further), add specific context\n"
            "3. Only output the reformulated question, nothing else\n\n"
            "Examples:\n"
            "History: User asked about project metrics, AI mentioned RMSE values\n"
            "Question: can you give me more details\n"
            "Standalone: can you give me more details about the RMSE evaluation metrics\n\n"
            "History: User asked about document analysis, AI mentioned accuracy scores\n"
            "Question: what about the other ones\n"
            "Standalone: what about the other accuracy scores in the document analysis\n\n"
            "History: User asked about machine learning, AI explained concepts\n"
            "Question: What is supervised learning?\n"
            "Standalone: What is supervised learning?\n\n"
            "Chat history:\n{chat_history}\n\n"
            "Question: {question}\n\n"
            "Standalone question:"
        ),
    )
    llm = get_ollama_llm("gemma3")
    return prompt | llm