"""add references table

Revision ID: add_references_table
Revises: 
Create Date: 2025-06-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_references_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('references',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('source', sa.String(length=255), nullable=False),
        sa.Column('source_path', sa.String(length=512), nullable=True),
        sa.Column('page', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('start_char', sa.Integer(), nullable=True),
        sa.Column('end_char', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.document_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_reference_message', 'references', ['message_id'])
    op.create_index('idx_reference_document', 'references', ['document_id'])


def downgrade():
    op.drop_table('references')
