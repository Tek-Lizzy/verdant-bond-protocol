import { Controller, Get, NotFoundException, Post, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { Role } from '../auth/rbac';

/** Inbox that system services (recovery, partial failures) notify. */
export const ADMIN_INBOX = 'admin';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Notifications are keyed by the authenticated wallet (JwtStrategy sets
  // walletAddress); maintainers also read the shared admin inbox.
  private inboxes(req: AuthenticatedRequest): string[] {
    const inboxes = [req.user.walletAddress];
    if (req.user.roles?.includes(Role.MAINTAINER)) inboxes.push(ADMIN_INBOX);
    return inboxes;
  }

  @Get()
  getNotifications(@Req() req: AuthenticatedRequest) {
    return this.inboxes(req)
      .flatMap((inbox) => this.notificationsService.getNotifications(inbox))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    for (const inbox of this.inboxes(req)) {
      const notification = this.notificationsService.markAsRead(inbox, id);
      if (notification) return notification;
    }
    throw new NotFoundException('Notification not found');
  }
}
