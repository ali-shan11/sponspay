import { Component, inject, OnInit } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { IntegrationDialogComponent } from './integration-dialog/integration-dialog.component';
import { MessageObj } from '@app-types/dashboard';
import { PaginationComponent } from '@components/pagination/pagination.component';
import { UserData } from '@app-types/components';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { CreatorSignInResponse } from '@app-types/onboarding';

@Component({
  selector: 'app-integration',
  imports: [PaginationComponent, IntegrationDialogComponent, DatePipe, NgClass],
  templateUrl: './integration.component.html',
  styleUrl: './integration.component.scss'
})
export class IntegrationComponent implements OnInit {
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);

  
  public user: UserData | null = this.tokenService.getCurrentUserObj();
  public isIntegrationDialogOpen = false;
  public signInResponse: CreatorSignInResponse | null = null;
  public messageList: MessageObj[] = [
    {
      userName: "Kwame Boateng",
      message: "Absolutely loving this session! Your insights are always so refreshing and valuable 🙌 ",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Nia Adebayo",
      message: "This is fantastic! Any tips on how to apply this to a smaller team with limited resources?",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Jelani Diallo",
      message: "Thank you so much for sharing. The point about iterative feedback really hit home for me. 💡",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Chidi Eze",
      message: "Can't wait for the next one! Will you be covering A/B testing strategies in the future?",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Fatima Al-Sayed",
      message: "This reminds me of a project I worked on last year. We learned these lessons the hard way. Great summary!",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Sofia Rossi",
      message: "Mind blown! 🤯 So much practical advice packed into one session. Amazing job!",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Zola Nkosi",
      message: "Incredible content! Are you going to share the slide deck or any recommended reading afterward?",
      date: "2025-06-10 15:30:00"
    },
    {
      userName: "Kenji Tanaka",
      message: "@designerdan you need to see this! This is exactly what we were talking about last week.",
      date: "2025-06-10 15:30:00"
    },
  ];

  ngOnInit(): void {
    this.subSignInResponse();
  }

  subSignInResponse(){
    this.authService.creatorSignInResponse$.subscribe((res:CreatorSignInResponse | null)=>{
      this.signInResponse = res;
    })
  }

  get isTelegramConnected(){
    return this.signInResponse && this.signInResponse.isCreator && this.signInResponse.isCoAdmin;
  }
}
